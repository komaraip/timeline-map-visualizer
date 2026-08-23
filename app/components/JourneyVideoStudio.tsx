"use client";
/* eslint-disable jsx-a11y/media-has-caption -- Generated travel videos contain music but no spoken dialogue. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { buildJourneyTrack, chooseRecordingMimeType, videoDimensions, type ExportStatus, type JourneyFrame, type JourneyVideoSettings, type SoundtrackId, type VideoAspectRatio, type VideoResolution } from "../../lib/video/journey";
import type { Position, TimelineEvent } from "../../lib/timeline/types";

interface JourneyVideoStudioProps {
  events: TimelineEvent[];
  onClose: () => void;
}

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";
const ENDING_SECONDS = 1.5;
const SOUNDTRACKS: Array<{ id: SoundtrackId; label: string; description: string; src?: string }> = [
  { id: "ambient-drift", label: "Ambient Drift", description: "Soft pads and a patient pulse", src: "audio/ambient-drift.wav" },
  { id: "bright-miles", label: "Bright Miles", description: "Warm, upbeat travel rhythm", src: "audio/bright-miles.wav" },
  { id: "cinematic-rise", label: "Cinematic Rise", description: "Wide chords and a bold finish", src: "audio/cinematic-rise.wav" },
  { id: "none", label: "No music", description: "Map animation only" },
  { id: "upload", label: "Upload your own", description: "Local audio from this device" },
];

const DEFAULT_SETTINGS: JourneyVideoSettings = {
  aspectRatio: "portrait",
  resolution: "standard",
  durationSec: 15,
  title: "My journey",
  subtitle: "",
  soundtrackId: "ambient-drift",
  volume: 0.7,
  fps: 30,
  mapMode: "basemap",
};

const lineCollection = (paths: Position[][]) => ({
  type: "FeatureCollection" as const,
  features: paths.filter((path) => path.length > 1).map((path, index) => ({
    type: "Feature" as const,
    id: index,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: path },
  })),
});

const pointCollection = (positions: Position[]) => ({
  type: "FeatureCollection" as const,
  features: positions.map((position, index) => ({
    type: "Feature" as const,
    id: index,
    properties: {},
    geometry: { type: "Point" as const, coordinates: position },
  })),
});

const formatPeriod = (startMs: number, endMs: number) => {
  if (!startMs) return "No dated journey";
  const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${formatter.format(startMs)} — ${formatter.format(endMs)}`;
};

const drawCover = (context: CanvasRenderingContext2D, source: HTMLCanvasElement, width: number, height: number) => {
  const scale = Math.max(width / source.width, height / source.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.drawImage(source, (source.width - sourceWidth) / 2, (source.height - sourceHeight) / 2, sourceWidth, sourceHeight, 0, 0, width, height);
};

export function JourneyVideoStudio({ events, onClose }: JourneyVideoStudioProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapReadyRef = useRef(false);
  const animationRef = useRef<number | undefined>(undefined);
  const startedAtRef = useRef(0);
  const startProgressRef = useRef(0);
  const previewAudioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const recordingStreamRef = useRef<MediaStream | undefined>(undefined);
  const recordingAudioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const recordingContextRef = useRef<AudioContext | undefined>(undefined);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);
  const minimalPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputUrlRef = useRef<string | undefined>(undefined);
  const customAudioUrlRef = useRef<string | undefined>(undefined);
  const cancelledExportRef = useRef(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [mapFallback, setMapFallback] = useState(false);
  const [customAudioName, setCustomAudioName] = useState("");
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [outputExtension, setOutputExtension] = useState<"mp4" | "webm">("webm");
  const track = useMemo(() => buildJourneyTrack(events), [events]);
  const frame = useMemo(() => track.frameAt(progress), [track, progress]);
  const period = useMemo(() => formatPeriod(track.startMs, track.endMs), [track.startMs, track.endMs]);
  const hasJourney = track.steps.length > 0;

  const updateMapFrame = useCallback((nextFrame: JourneyFrame, overview = false) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    (map.getSource("journey-completed") as GeoJSONSource | undefined)?.setData(lineCollection(nextFrame.completedPaths));
    (map.getSource("journey-active") as GeoJSONSource | undefined)?.setData(lineCollection(nextFrame.activePath.length ? [nextFrame.activePath] : []));
    (map.getSource("journey-marker") as GeoJSONSource | undefined)?.setData(pointCollection(nextFrame.position ? [nextFrame.position] : []));
    if (overview && track.bounds) {
      map.fitBounds([[track.bounds.west, track.bounds.south], [track.bounds.east, track.bounds.north]], { padding: 72, duration: 0, maxZoom: 14 });
    } else if (nextFrame.position) {
      map.jumpTo({ center: nextFrame.position, zoom: Math.max(8, Math.min(12.5, map.getZoom())) });
    }
  }, [track.bounds]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let disposed = false;
    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (disposed || !mapContainerRef.current) return;
      const center = track.frameAt(0).position ?? [0, 18];
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center,
        zoom: 9,
        attributionControl: {},
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
      map.on("load", () => {
        map.addSource("journey-completed", { type: "geojson", data: lineCollection([]) });
        map.addSource("journey-active", { type: "geojson", data: lineCollection([]) });
        map.addSource("journey-visits", { type: "geojson", data: pointCollection(track.visits.map((visit) => visit.position)) });
        map.addSource("journey-marker", { type: "geojson", data: pointCollection([]) });
        map.addLayer({ id: "journey-completed", type: "line", source: "journey-completed", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ff7145", "line-width": 5, "line-opacity": 0.38 } });
        map.addLayer({ id: "journey-active", type: "line", source: "journey-active", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#d8ff5f", "line-width": 8, "line-opacity": 0.95 } });
        map.addLayer({ id: "journey-visits", type: "circle", source: "journey-visits", paint: { "circle-color": "#ff7145", "circle-radius": 5, "circle-stroke-color": "#f3f0e7", "circle-stroke-width": 2 } });
        map.addLayer({ id: "journey-marker", type: "circle", source: "journey-marker", paint: { "circle-color": "#172c24", "circle-radius": 10, "circle-stroke-color": "#d8ff5f", "circle-stroke-width": 4 } });
        mapReadyRef.current = true;
        setMapReady(true);
        updateMapFrame(track.frameAt(0));
      });
      map.on("error", () => setMapFallback(true));
      mapRef.current = map;
    });
    return () => {
      disposed = true;
      mapReadyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [track, updateMapFrame]);

  const audioSource = useCallback(() => {
    if (settings.soundtrackId === "none") return "";
    if (settings.soundtrackId === "upload") return customAudioUrlRef.current || "";
    const soundtrack = SOUNDTRACKS.find((item) => item.id === settings.soundtrackId);
    return soundtrack?.src ? new URL(soundtrack.src, document.baseURI).toString() : "";
  }, [settings.soundtrackId]);

  const stopPreviewAudio = useCallback(() => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = undefined;
  }, []);

  const startPreviewAudio = useCallback((offsetSeconds: number) => {
    stopPreviewAudio();
    const source = audioSource();
    if (!source) return;
    const audio = new Audio(source);
    audio.loop = true;
    audio.volume = settings.volume;
    audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = offsetSeconds % audio.duration;
    }, { once: true });
    previewAudioRef.current = audio;
    void audio.play().catch(() => setExportMessage("Select Play again if your browser paused the soundtrack."));
  }, [audioSource, settings.volume, stopPreviewAudio]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = undefined;
    setPlaying(false);
    stopPreviewAudio();
  }, [stopPreviewAudio]);

  function animatePreview(timestamp: number) {
    const elapsed = (timestamp - startedAtRef.current) / 1000;
    const timelineElapsed = startProgressRef.current * settings.durationSec + elapsed;
    const nextProgress = Math.min(1, timelineElapsed / settings.durationSec);
    const overview = timelineElapsed >= settings.durationSec;
    setProgress(nextProgress);
    updateMapFrame(track.frameAt(nextProgress), overview);
    if (timelineElapsed >= settings.durationSec + ENDING_SECONDS) {
      setPlaying(false);
      stopPreviewAudio();
      animationRef.current = undefined;
      return;
    }
    animationRef.current = requestAnimationFrame(animatePreview);
  }

  const togglePlayback = () => {
    if (playing) { stopAnimation(); return; }
    const nextStart = progress >= 1 ? 0 : progress;
    setProgress(nextStart);
    startProgressRef.current = nextStart;
    startedAtRef.current = performance.now();
    startPreviewAudio(nextStart * settings.durationSec);
    setPlaying(true);
    animationRef.current = requestAnimationFrame(animatePreview);
  };

  const restart = () => {
    stopAnimation();
    setProgress(0);
    updateMapFrame(track.frameAt(0));
  };

  const seek = (nextProgress: number) => {
    const wasPlaying = playing;
    stopAnimation();
    setProgress(nextProgress);
    updateMapFrame(track.frameAt(nextProgress), nextProgress >= 1);
    if (wasPlaying && nextProgress < 1) {
      startProgressRef.current = nextProgress;
      startedAtRef.current = performance.now();
      startPreviewAudio(nextProgress * settings.durationSec);
      setPlaying(true);
      animationRef.current = requestAnimationFrame(animatePreview);
    }
  };

  const projectMinimal = useCallback((position: Position, width: number, height: number) => {
    const bounds = track.bounds;
    if (!bounds) return { x: width / 2, y: height / 2 };
    let longitude = position[0];
    while (longitude < bounds.west) longitude += 360;
    while (longitude > bounds.east && longitude - 360 >= bounds.west) longitude -= 360;
    const longitudeSpan = Math.max(0.0001, bounds.east - bounds.west);
    const latitudeSpan = Math.max(0.0001, bounds.north - bounds.south);
    return {
      x: width * (0.1 + 0.8 * (longitude - bounds.west) / longitudeSpan),
      y: height * (0.9 - 0.8 * (position[1] - bounds.south) / latitudeSpan),
    };
  }, [track.bounds]);

  const drawMinimalMap = useCallback((context: CanvasRenderingContext2D, width: number, height: number, nextFrame: JourneyFrame) => {
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#b8dacb");
    background.addColorStop(1, "#e9e3cd");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(23,44,36,.09)";
    context.lineWidth = Math.max(1, width / 720);
    const grid = Math.max(48, width / 9);
    for (let x = -height; x < width + height; x += grid) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x + height, height); context.stroke();
    }
    const drawPaths = (paths: Position[][], color: string, alpha: number, lineWidth: number) => {
      context.save(); context.strokeStyle = color; context.globalAlpha = alpha; context.lineWidth = lineWidth; context.lineCap = "round"; context.lineJoin = "round";
      for (const path of paths) {
        if (path.length < 2) continue;
        context.beginPath();
        path.forEach((position, index) => { const point = projectMinimal(position, width, height); if (!index) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y); });
        context.stroke();
      }
      context.restore();
    };
    drawPaths(nextFrame.completedPaths, "#ff7145", 0.45, Math.max(4, width / 140));
    drawPaths(nextFrame.activePath.length ? [nextFrame.activePath] : [], "#d8ff5f", 1, Math.max(7, width / 90));
  }, [projectMinimal]);

  useEffect(() => {
    if (!mapFallback && settings.mapMode !== "minimal") return;
    const canvas = minimalPreviewCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const dimensions = videoDimensions(settings.aspectRatio, "standard");
    canvas.width = Math.round(dimensions.width / 2);
    canvas.height = Math.round(dimensions.height / 2);
    const previewFrame = progress >= 1
      ? { ...track.frameAt(1), completedPaths: track.movements.map((step) => step.path), activePath: [] }
      : frame;
    drawMinimalMap(context, canvas.width, canvas.height, previewFrame);
    if (previewFrame.position) {
      const marker = projectMinimal(previewFrame.position, canvas.width, canvas.height);
      context.beginPath(); context.arc(marker.x, marker.y, Math.max(7, canvas.width * 0.018), 0, Math.PI * 2); context.fillStyle = "#172c24"; context.fill();
      context.lineWidth = Math.max(3, canvas.width * 0.007); context.strokeStyle = "#d8ff5f"; context.stroke();
    }
  }, [drawMinimalMap, frame, mapFallback, progress, projectMinimal, settings.aspectRatio, settings.mapMode, track]);

  const drawCompositeFrame = useCallback((canvas: HTMLCanvasElement, nextFrame: JourneyFrame, overview: boolean, useBasemap: boolean) => {
    const context = canvas.getContext("2d");
    if (!context) return;
    const { width, height } = canvas;
    const mapCanvas = mapRef.current?.getCanvas();
    context.clearRect(0, 0, width, height);
    if (useBasemap && mapCanvas?.width && mapCanvas.height) drawCover(context, mapCanvas, width, height);
    else drawMinimalMap(context, width, height, overview ? { ...track.frameAt(1), completedPaths: track.movements.map((step) => step.path), activePath: [] } : nextFrame);

    const topShade = context.createLinearGradient(0, 0, 0, height * 0.3);
    topShade.addColorStop(0, "rgba(23,44,36,.78)"); topShade.addColorStop(1, "rgba(23,44,36,0)");
    context.fillStyle = topShade; context.fillRect(0, 0, width, height * 0.32);
    const bottomShade = context.createLinearGradient(0, height * 0.62, 0, height);
    bottomShade.addColorStop(0, "rgba(23,44,36,0)"); bottomShade.addColorStop(1, "rgba(23,44,36,.9)");
    context.fillStyle = bottomShade; context.fillRect(0, height * 0.6, width, height * 0.4);

    const margin = width * 0.065;
    context.fillStyle = "#f3f0e7";
    context.font = `600 ${Math.round(width * 0.062)}px Georgia, serif`;
    context.fillText(settings.title || "My journey", margin, margin * 1.45, width - margin * 2);
    context.font = `700 ${Math.round(width * 0.021)}px Arial, sans-serif`;
    context.fillStyle = "rgba(243,240,231,.78)";
    context.fillText(settings.subtitle || period, margin, margin * 2.05, width - margin * 2);

    if (nextFrame.position) {
      let marker = projectMinimal(nextFrame.position, width, height);
      if (useBasemap && mapRef.current && mapContainerRef.current) {
        const projected = mapRef.current.project(nextFrame.position);
        marker = { x: projected.x / mapContainerRef.current.clientWidth * width, y: projected.y / mapContainerRef.current.clientHeight * height };
      }
      context.beginPath(); context.arc(marker.x, marker.y, Math.max(10, width * 0.018), 0, Math.PI * 2); context.fillStyle = "#172c24"; context.fill();
      context.lineWidth = Math.max(4, width * 0.007); context.strokeStyle = "#d8ff5f"; context.stroke();
    }

    context.fillStyle = "#f3f0e7";
    context.font = `600 ${Math.round(width * 0.032)}px Georgia, serif`;
    context.fillText(overview ? "Journey complete" : nextFrame.currentLabel, margin, height - margin * 2.15, width - margin * 2);
    context.font = `700 ${Math.round(width * 0.019)}px Arial, sans-serif`;
    context.fillStyle = "rgba(243,240,231,.76)";
    const metrics = `${track.totalDistanceKm.toFixed(track.totalDistanceKm < 100 ? 1 : 0)} km mapped  ·  ${track.visits.length} visits`;
    context.fillText(metrics, margin, height - margin * 1.55, width - margin * 2);
    context.fillStyle = "rgba(243,240,231,.28)"; context.fillRect(margin, height - margin * 0.72, width - margin * 2, Math.max(5, height * 0.004));
    context.fillStyle = "#d8ff5f"; context.fillRect(margin, height - margin * 0.72, (width - margin * 2) * nextFrame.progress, Math.max(5, height * 0.004));
    context.font = `700 ${Math.round(width * 0.014)}px Arial, sans-serif`; context.fillStyle = "rgba(243,240,231,.7)";
    context.fillText("TIMELINE MAP VISUALIZER  ·  CREATED LOCALLY", margin, height - margin * 0.28);
  }, [drawMinimalMap, period, projectMinimal, settings.subtitle, settings.title, track]);

  const basemapIsRecordable = () => {
    if (settings.mapMode === "minimal" || mapFallback || !mapRef.current) return false;
    try {
      const scratch = document.createElement("canvas"); scratch.width = 2; scratch.height = 2;
      const context = scratch.getContext("2d"); if (!context) return false;
      context.drawImage(mapRef.current.getCanvas(), 0, 0, 2, 2); scratch.toDataURL("image/png");
      return true;
    } catch { return false; }
  };

  const releaseRecordingResources = useCallback(() => {
    recorderRef.current = undefined;
    recordingStreamRef.current?.getTracks().forEach((trackItem) => trackItem.stop());
    recordingStreamRef.current = undefined;
    recordingAudioRef.current?.pause(); recordingAudioRef.current = undefined;
    if (recordingContextRef.current) void recordingContextRef.current.close();
    recordingContextRef.current = undefined;
  }, []);

  const cancelExport = useCallback(() => {
    cancelledExportRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    releaseRecordingResources();
    setExportStatus("cancelled"); setExportMessage("Video creation cancelled."); setExportProgress(0);
  }, [releaseRecordingResources]);

  const createVideo = async () => {
    if (!hasJourney || exportStatus === "recording" || exportStatus === "preparing") return;
    cancelledExportRef.current = false;
    stopAnimation(); setExportStatus("preparing"); setExportProgress(0); setExportMessage("Preparing local renderer…");
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    outputUrlRef.current = undefined; setOutputUrl("");
    const canvas = exportCanvasRef.current;
    if (!canvas || typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") {
      setExportStatus("error"); setExportMessage("Video recording is not supported by this browser."); return;
    }
    const dimensions = videoDimensions(settings.aspectRatio, settings.resolution);
    canvas.width = dimensions.width; canvas.height = dimensions.height;
    const useBasemap = basemapIsRecordable();
    if (!useBasemap) { setMapFallback(true); setExportMessage("Using the private minimal map because basemap recording is unavailable."); }
    const captureStream = canvas.captureStream(settings.fps);
    recordingStreamRef.current = captureStream;

    const source = audioSource();
    let gainNode: GainNode | undefined;
    if (source) {
      try {
        const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextCtor();
        const audio = new Audio(source); audio.loop = true; audio.crossOrigin = "anonymous";
        const mediaSource = audioContext.createMediaElementSource(audio);
        gainNode = audioContext.createGain();
        const destination = audioContext.createMediaStreamDestination();
        mediaSource.connect(gainNode); gainNode.connect(destination);
        destination.stream.getAudioTracks().forEach((trackItem) => captureStream.addTrack(trackItem));
        recordingContextRef.current = audioContext; recordingAudioRef.current = audio;
        await audio.play();
      } catch { setExportMessage("The video will be recorded without audio because this soundtrack could not be decoded."); }
    }

    const format = chooseRecordingMimeType((mimeType) => MediaRecorder.isTypeSupported(mimeType));
    setOutputExtension(format.extension);
    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(captureStream, {
        ...(format.mimeType ? { mimeType: format.mimeType } : {}),
        videoBitsPerSecond: settings.resolution === "hd" ? 8_000_000 : 4_000_000,
        audioBitsPerSecond: 160_000,
      });
    } catch {
      releaseRecordingResources(); setExportStatus("error"); setExportMessage("This browser could not start its local video encoder."); return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { releaseRecordingResources(); setExportStatus("error"); setExportMessage("The local video encoder stopped unexpectedly."); };
    recorder.onstop = () => {
      if (cancelledExportRef.current) { releaseRecordingResources(); return; }
      if (!chunks.length) {
        releaseRecordingResources(); setExportStatus("error"); setExportMessage("The browser finished without producing a video file."); return;
      }
      const blob = new Blob(chunks, { type: format.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob); outputUrlRef.current = url; setOutputUrl(url);
      releaseRecordingResources(); setExportStatus("complete"); setExportProgress(1); setExportMessage(`${format.extension.toUpperCase()} ready · ${(blob.size / 1_048_576).toFixed(1)} MB`);
    };

    recorder.start(1000);
    setExportStatus("recording"); setExportMessage(`Recording ${format.extension.toUpperCase()} locally…`);
    const totalSeconds = settings.durationSec + ENDING_SECONDS;
    const recordingStarted = performance.now();
    const render = (timestamp: number) => {
      if (recorder.state !== "recording") return;
      const elapsed = (timestamp - recordingStarted) / 1000;
      const overview = elapsed > settings.durationSec;
      const journeyProgress = Math.min(1, elapsed / settings.durationSec);
      const nextFrame = track.frameAt(journeyProgress);
      updateMapFrame(nextFrame, overview);
      const fade = Math.min(1, elapsed / 0.6, Math.max(0, (totalSeconds - elapsed) / 0.7));
      if (gainNode) gainNode.gain.value = settings.volume * fade;
      drawCompositeFrame(canvas, nextFrame, overview, useBasemap);
      setExportProgress(Math.min(1, elapsed / totalSeconds));
      setExportMessage(`Recording ${format.extension.toUpperCase()} locally · ${Math.max(0, Math.ceil(totalSeconds - elapsed))}s remaining`);
      if (elapsed >= totalSeconds) { setExportStatus("finalizing"); setExportMessage("Finalizing the local video…"); recorder.stop(); return; }
      animationRef.current = requestAnimationFrame(render);
    };
    animationRef.current = requestAnimationFrame(render);
  };

  const chooseCustomAudio = (file?: File) => {
    if (!file) return;
    if (customAudioUrlRef.current) URL.revokeObjectURL(customAudioUrlRef.current);
    customAudioUrlRef.current = URL.createObjectURL(file);
    setCustomAudioName(file.name);
    setSettings((current) => ({ ...current, soundtrackId: "upload" }));
  };

  const downloadVideo = () => {
    if (!outputUrl) return;
    const anchor = document.createElement("a"); anchor.href = outputUrl; anchor.download = `timeline-journey.${outputExtension}`; anchor.click();
  };

  useEffect(() => {
    updateMapFrame(frame, progress >= 1);
  }, [frame, progress, updateMapFrame]);

  useEffect(() => {
    if (previewAudioRef.current) previewAudioRef.current.volume = settings.volume;
  }, [settings.volume]);

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    stopPreviewAudio(); releaseRecordingResources();
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    if (customAudioUrlRef.current) URL.revokeObjectURL(customAudioUrlRef.current);
  }, [releaseRecordingResources, stopPreviewAudio]);

  const closeStudio = useCallback(() => { stopAnimation(); cancelExport(); onClose(); }, [cancelExport, onClose, stopAnimation]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeStudio(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeStudio]);
  const previewClass = `studio-preview studio-${settings.aspectRatio}`;
  const formatLabel = typeof MediaRecorder === "undefined" ? "Recording unavailable" : chooseRecordingMimeType((mime) => MediaRecorder.isTypeSupported(mime)).extension.toUpperCase();

  return (
    <div className="studio-overlay" role="dialog" aria-modal="true" aria-labelledby="studio-title">
      <header className="studio-header">
        <div><span className="studio-kicker">Journey Video Studio</span><h1 id="studio-title">Create a moving memory.</h1></div>
        <button type="button" className="studio-close" onClick={closeStudio} aria-label="Close video studio">×</button>
      </header>

      <div className="studio-body">
        <section className="studio-stage" aria-label="Animated journey preview">
          <div className={previewClass}>
            <div ref={mapContainerRef} className="studio-map" />
            {(!mapReady || mapFallback || settings.mapMode === "minimal") && <div className="studio-minimal-preview"><div className="studio-minimal-grid" /><canvas ref={minimalPreviewCanvasRef} /><span>{!mapReady && !mapFallback && settings.mapMode !== "minimal" ? "LOADING BASEMAP" : "PRIVATE MAP MODE"}</span></div>}
            <div className="studio-preview-shade studio-preview-shade-top" />
            <div className="studio-preview-shade studio-preview-shade-bottom" />
            <div className="studio-title-card"><strong>{settings.title || "My journey"}</strong><span>{settings.subtitle || period}</span></div>
            <div className="studio-now"><strong>{progress >= 1 ? "Journey complete" : frame.currentLabel}</strong><span>{track.totalDistanceKm.toFixed(track.totalDistanceKm < 100 ? 1 : 0)} km mapped · {track.visits.length} visits</span></div>
            <div className="studio-progress-visual"><i style={{ width: `${progress * 100}%` }} /></div>
            <div className="studio-watermark">TIMELINE MAP VISUALIZER · CREATED LOCALLY</div>
          </div>

          <div className="studio-transport">
            <button type="button" onClick={restart} aria-label="Restart preview">↺</button>
            <button type="button" className="studio-play" onClick={togglePlayback} disabled={!hasJourney}>{playing ? "Pause" : "Play preview"}</button>
            <input aria-label="Journey preview position" type="range" min="0" max="1" step="0.001" value={progress} onChange={(event) => seek(Number(event.target.value))} />
            <time>{Math.round(progress * settings.durationSec)}s / {settings.durationSec}s</time>
          </div>
          {!track.movements.length && <p className="studio-notice">This selection has no mapped movement. The video will reveal visits without drawing invented routes.</p>}
        </section>

        <aside className="studio-controls">
          <section><div className="studio-section-title"><span>01</span><strong>Story</strong></div><label>Title<input value={settings.title} maxLength={64} onChange={(event) => setSettings((current) => ({ ...current, title: event.target.value }))} /></label><label>Subtitle<input value={settings.subtitle} maxLength={80} placeholder={period} onChange={(event) => setSettings((current) => ({ ...current, subtitle: event.target.value }))} /></label></section>
          <section><div className="studio-section-title"><span>02</span><strong>Canvas</strong></div><div className="studio-choice-grid" aria-label="Video aspect ratio">{([['portrait', '9:16'], ['square', '1:1'], ['landscape', '16:9']] as Array<[VideoAspectRatio, string]>).map(([value, label]) => <button type="button" key={value} className={settings.aspectRatio === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, aspectRatio: value }))}>{label}</button>)}</div><div className="studio-choice-grid studio-choice-grid-two" aria-label="Video resolution">{([['standard', '720p'], ['hd', '1080p']] as Array<[VideoResolution, string]>).map(([value, label]) => <button type="button" key={value} className={settings.resolution === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, resolution: value }))}>{label}</button>)}</div><div className="studio-choice-grid studio-choice-grid-four" aria-label="Journey duration">{([10, 15, 30, 60] as const).map((value) => <button type="button" key={value} className={settings.durationSec === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, durationSec: value }))}>{value}s</button>)}</div></section>
          <section><div className="studio-section-title"><span>03</span><strong>Soundtrack</strong></div><div className="soundtrack-list">{SOUNDTRACKS.map((soundtrack) => <button type="button" key={soundtrack.id} className={settings.soundtrackId === soundtrack.id ? "active" : ""} onClick={() => soundtrack.id === "upload" ? fileInputRef.current?.click() : setSettings((current) => ({ ...current, soundtrackId: soundtrack.id }))}><i>{soundtrack.id === "none" ? "—" : soundtrack.id === "upload" ? "+" : "♫"}</i><span><strong>{soundtrack.id === "upload" && customAudioName ? customAudioName : soundtrack.label}</strong><small>{soundtrack.description}</small></span></button>)}</div><input ref={fileInputRef} hidden type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg,.mp3,.wav,.m4a,.aac,.ogg" onChange={(event) => chooseCustomAudio(event.target.files?.[0])} /><label>Music volume <output>{Math.round(settings.volume * 100)}%</output><input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(event) => setSettings((current) => ({ ...current, volume: Number(event.target.value) }))} /></label></section>
          <section><div className="studio-section-title"><span>04</span><strong>Map & export</strong></div><div className="studio-choice-grid studio-choice-grid-two">{([['basemap', 'Basemap'], ['minimal', 'Private minimal']] as const).map(([value, label]) => <button type="button" key={value} className={settings.mapMode === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, mapMode: value }))}>{label}</button>)}</div><p className="studio-export-note">Preferred format: <strong>{formatLabel}</strong>. Timeline and audio stay in this tab. Basemap tiles may reveal viewed areas to the configured provider.</p><button type="button" className="studio-create" disabled={!hasJourney || exportStatus === "recording" || exportStatus === "preparing" || exportStatus === "finalizing"} onClick={() => void createVideo()}>{exportStatus === "recording" ? "Creating video…" : "Create video"}</button>{exportStatus === "recording" && <button type="button" className="studio-cancel" onClick={cancelExport}>Cancel</button>}<div className="studio-export-progress" aria-live="polite"><i style={{ width: `${exportProgress * 100}%` }} /><span>{exportMessage}</span></div>{outputUrl && <div className="studio-result">{/* Generated journeys contain music but no spoken dialogue requiring captions. */}<video src={outputUrl} controls playsInline muted={false} aria-label="Generated journey video" /><button type="button" onClick={downloadVideo}>Download {outputExtension.toUpperCase()}</button></div>}</section>
        </aside>
      </div>
      <canvas ref={exportCanvasRef} className="studio-export-canvas" aria-hidden="true" />
    </div>
  );
}
