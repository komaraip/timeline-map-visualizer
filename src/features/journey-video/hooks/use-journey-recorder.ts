import { useCallback, useEffect, useRef, useState } from "react";
import { chooseRecordingMimeType } from "../media/mime-types";
import type { JourneyFrame, JourneyTrack } from "../model/journey-track";
import { journeyPresentationAt, journeyVideoSeconds, videoBitrate, videoDimensions, type ExportStatus, type JourneyCameraState, type JourneyVideoSettings } from "../model/video-settings";

interface JourneyRecorderOptions {
  track: JourneyTrack;
  settings: JourneyVideoSettings;
  audioSource: string;
  hasJourney: boolean;
  stopPlayback: () => void;
  basemapIsRecordable: () => boolean;
  prepareBasemapCapture: (width: number, height: number) => void;
  restoreBasemapCapture: () => void;
  onFallback: () => void;
  onFrame: (frame: JourneyFrame, camera: JourneyCameraState) => void;
  drawFrame: (canvas: HTMLCanvasElement, frame: JourneyFrame, camera: JourneyCameraState, useBasemap: boolean) => void;
}

const BASEMAP_SUPERSAMPLE = 1.25;

export function useJourneyRecorder(options: JourneyRecorderOptions) {
  const {
    track,
    settings,
    audioSource,
    hasJourney,
    stopPlayback,
    basemapIsRecordable,
    prepareBasemapCapture,
    restoreBasemapCapture,
    onFallback,
    onFrame,
    drawFrame,
  } = options;
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const recordingStreamRef = useRef<MediaStream | undefined>(undefined);
  const recordingAudioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const recordingContextRef = useRef<AudioContext | undefined>(undefined);
  const outputUrlRef = useRef<string | undefined>(undefined);
  const cancelledRef = useRef(false);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [outputExtension, setOutputExtension] = useState<"mp4" | "webm">("webm");

  const releaseResources = useCallback(() => {
    recorderRef.current = undefined;
    recordingStreamRef.current?.getTracks().forEach((trackItem) => trackItem.stop());
    recordingStreamRef.current = undefined;
    recordingAudioRef.current?.pause();
    recordingAudioRef.current = undefined;
    if (recordingContextRef.current) void recordingContextRef.current.close();
    recordingContextRef.current = undefined;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = undefined;
    restoreBasemapCapture();
  }, [restoreBasemapCapture]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    releaseResources();
    setStatus("cancelled");
    setMessage("Video creation cancelled.");
    setProgress(0);
  }, [releaseResources]);

  const createVideo = useCallback(async () => {
    if (!hasJourney || status === "recording" || status === "preparing") return;
    cancelledRef.current = false;
    stopPlayback();
    setStatus("preparing"); setProgress(0); setMessage("Preparing local renderer…");
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    outputUrlRef.current = undefined; setOutputUrl("");
    const canvas = exportCanvasRef.current;
    if (!canvas || typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") {
      setStatus("error"); setMessage("Video recording is not supported by this browser."); return;
    }
    const dimensions = videoDimensions(settings.aspectRatio, settings.resolution);
    canvas.width = dimensions.width; canvas.height = dimensions.height;
    const useBasemap = basemapIsRecordable();
    if (useBasemap) {
      setMessage("Preparing the basemap at full video resolution...");
      prepareBasemapCapture(
        Math.round(dimensions.width * BASEMAP_SUPERSAMPLE),
        Math.round(dimensions.height * BASEMAP_SUPERSAMPLE),
      );
    } else {
      onFallback();
      setMessage("Using the private minimal map because basemap recording is unavailable.");
    }
    const captureStream = canvas.captureStream(settings.fps);
    recordingStreamRef.current = captureStream;
    let gainNode: GainNode | undefined;
    if (audioSource) {
      try {
        const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextCtor();
        const audio = new Audio(audioSource); audio.loop = true; audio.crossOrigin = "anonymous";
        const mediaSource = audioContext.createMediaElementSource(audio);
        gainNode = audioContext.createGain();
        const destination = audioContext.createMediaStreamDestination();
        mediaSource.connect(gainNode); gainNode.connect(destination);
        destination.stream.getAudioTracks().forEach((trackItem) => captureStream.addTrack(trackItem));
        recordingContextRef.current = audioContext; recordingAudioRef.current = audio;
        await audio.play();
      } catch {
        setMessage("The video will be recorded without audio because this soundtrack could not be decoded.");
      }
    }

    const format = chooseRecordingMimeType((mimeType) => MediaRecorder.isTypeSupported(mimeType));
    setOutputExtension(format.extension);
    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(captureStream, {
        ...(format.mimeType ? { mimeType: format.mimeType } : {}),
        videoBitsPerSecond: videoBitrate(settings),
        audioBitsPerSecond: 192_000,
      });
    } catch {
      releaseResources(); setStatus("error"); setMessage("This browser could not start its local video encoder."); return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { releaseResources(); setStatus("error"); setMessage("The local video encoder stopped unexpectedly."); };
    recorder.onstop = () => {
      if (cancelledRef.current) { releaseResources(); return; }
      if (!chunks.length) { releaseResources(); setStatus("error"); setMessage("The browser finished without producing a video file."); return; }
      const blob = new Blob(chunks, { type: format.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      outputUrlRef.current = url; setOutputUrl(url);
      releaseResources(); setStatus("complete"); setProgress(1);
      setMessage(`${format.extension.toUpperCase()} ready · ${(blob.size / 1_048_576).toFixed(1)} MB`);
    };

    recorder.start(1000);
    setStatus("recording"); setMessage(`Recording ${format.extension.toUpperCase()} locally…`);
    const totalSeconds = journeyVideoSeconds(settings.durationSec);
    const initialPresentation = journeyPresentationAt(0, settings.durationSec);
    const initialFrame = track.frameAt(initialPresentation.routeProgress);
    onFrame(initialFrame, initialPresentation.camera);
    drawFrame(canvas, initialFrame, initialPresentation.camera, useBasemap);
    const recordingStarted = performance.now();
    const frameIntervalMs = 1000 / settings.fps;
    let nextFrameAt = recordingStarted + frameIntervalMs;
    let lastUiUpdate = 0;
    const render = (timestamp: number) => {
      if (recorder.state !== "recording") return;
      const elapsed = (timestamp - recordingStarted) / 1000;
      const boundedElapsed = Math.min(totalSeconds, elapsed);
      const shouldRender = timestamp + 1 >= nextFrameAt || boundedElapsed >= totalSeconds;
      if (shouldRender) {
        while (nextFrameAt <= timestamp + 1) nextFrameAt += frameIntervalMs;
        const presentation = journeyPresentationAt(boundedElapsed, settings.durationSec);
        const frame = track.frameAt(presentation.routeProgress);
        onFrame(frame, presentation.camera);
        drawFrame(canvas, frame, presentation.camera, useBasemap);
      }
      const fade = Math.min(1, boundedElapsed / 0.6, Math.max(0, (totalSeconds - boundedElapsed) / 0.7));
      if (gainNode) gainNode.gain.value = settings.volume * fade;
      if (timestamp - lastUiUpdate >= 100 || boundedElapsed >= totalSeconds) {
        lastUiUpdate = timestamp;
        setProgress(Math.min(1, boundedElapsed / totalSeconds));
        setMessage(`Recording ${format.extension.toUpperCase()} locally · ${Math.max(0, Math.ceil(totalSeconds - boundedElapsed))}s remaining`);
      }
      if (elapsed >= totalSeconds) { setStatus("finalizing"); setMessage("Finalizing the local video…"); recorder.stop(); return; }
      animationRef.current = requestAnimationFrame(render);
    };
    animationRef.current = requestAnimationFrame(render);
  }, [audioSource, basemapIsRecordable, drawFrame, hasJourney, onFallback, onFrame, prepareBasemapCapture, releaseResources, settings, status, stopPlayback, track]);

  const download = useCallback(() => {
    if (!outputUrl) return;
    const anchor = document.createElement("a");
    anchor.href = outputUrl;
    anchor.download = `timeline-journey.${outputExtension}`;
    anchor.click();
  }, [outputExtension, outputUrl]);

  useEffect(() => () => {
    releaseResources();
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
  }, [releaseResources]);

  const formatLabel = typeof MediaRecorder === "undefined"
    ? "Recording unavailable"
    : chooseRecordingMimeType((mime) => MediaRecorder.isTypeSupported(mime)).extension.toUpperCase();

  return { exportCanvasRef, status, progress, message, outputUrl, outputExtension, formatLabel, createVideo, cancel, download };
}
