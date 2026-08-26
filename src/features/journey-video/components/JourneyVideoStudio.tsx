import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TimelineEvent } from "@/core/timeline";
import { useJourneyPlayback } from "../hooks/use-journey-playback";
import { useJourneyRecorder } from "../hooks/use-journey-recorder";
import { useStudioMap } from "../hooks/use-studio-map";
import { soundtrackSource } from "../media/soundtrack-catalog";
import { buildJourneyTrack } from "../model/journey-track";
import {
  DEFAULT_VIDEO_SETTINGS,
  estimatedVideoSizeMb,
  videoBitrate,
  videoDimensions,
  type JourneyCameraState,
} from "../model/video-settings";
import { drawCompositeFrame } from "../rendering/canvas-renderer";
import {
  createCameraProjector,
  createMinimalProjector,
  drawJourneyMarker,
  drawMinimalMap,
} from "../rendering/minimal-map-renderer";
import { JourneyControls } from "./JourneyControls";
import { JourneyPreview } from "./JourneyPreview";
import { SoundtrackPicker } from "./SoundtrackPicker";
import { VideoExportPanel } from "./VideoExportPanel";

interface JourneyVideoStudioProps {
  events: TimelineEvent[];
  onClose: () => void;
}

const formatPeriod = (startMs: number, endMs: number) => {
  if (!startMs) return "No dated journey";
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(startMs)} - ${formatter.format(endMs)}`;
};

export function JourneyVideoStudio({ events, onClose }: JourneyVideoStudioProps) {
  const [settings, setSettings] = useState(DEFAULT_VIDEO_SETTINGS);
  const [customAudioName, setCustomAudioName] = useState("");
  const [customAudioUrl, setCustomAudioUrl] = useState("");
  const customAudioUrlRef = useRef("");
  const minimalPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const track = useMemo(() => buildJourneyTrack(events), [events]);
  const period = useMemo(() => formatPeriod(track.startMs, track.endMs), [track.endMs, track.startMs]);
  const projectMinimal = useMemo(() => createMinimalProjector(track.bounds), [track.bounds]);
  const source = useMemo(
    () => soundtrackSource(settings.soundtrackId, customAudioUrl),
    [customAudioUrl, settings.soundtrackId],
  );
  const outputDimensions = videoDimensions(settings.aspectRatio, settings.resolution);
  const qualityLabel = `${outputDimensions.width}x${outputDimensions.height} | ${settings.fps} FPS | ${(videoBitrate(settings) / 1_000_000).toFixed(1)} Mbps target | ~${estimatedVideoSizeMb(settings).toFixed(0)} MB`;
  const {
    mapContainerRef,
    mapRef,
    mapReady,
    mapFallback,
    setMapFallback,
    updateMapFrame,
    basemapIsRecordable,
    projectBasemap,
    prepareBasemapCapture,
    restoreBasemapCapture,
  } = useStudioMap(track);

  const {
    frame,
    camera,
    playing,
    progress,
    togglePlayback,
    restart,
    seek,
    stopPlayback,
  } = useJourneyPlayback({
    track,
    durationSec: settings.durationSec,
    volume: settings.volume,
    audioSource: source,
    onFrame: updateMapFrame,
  });

  useEffect(() => {
    if (!mapFallback && settings.mapMode !== "minimal") return;
    const canvas = minimalPreviewCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const dimensions = videoDimensions(settings.aspectRatio, "standard");
    const pixelRatio = Math.min(2.5, window.devicePixelRatio || 1);
    const width = Math.round((canvas.clientWidth || dimensions.width / 2) * pixelRatio);
    const height = Math.round((canvas.clientHeight || dimensions.height / 2) * pixelRatio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const previewFrame = camera.phase === "overview"
      ? { ...track.frameAt(1), completedPaths: track.movements.map((step) => step.path), activePath: [] }
      : frame;
    const cameraProjector = createCameraProjector(projectMinimal, frame.position, camera);
    drawMinimalMap(context, canvas.width, canvas.height, previewFrame, cameraProjector);
    if (previewFrame.position) {
      drawJourneyMarker(
        context,
        cameraProjector(previewFrame.position, canvas.width, canvas.height),
        canvas.width,
      );
    }
  }, [camera, frame, mapFallback, projectMinimal, settings.aspectRatio, settings.mapMode, track]);

  const renderFrame = useCallback((
    canvas: HTMLCanvasElement,
    journeyFrame: ReturnType<typeof track.frameAt>,
    cameraState: JourneyCameraState,
    useBasemap: boolean,
  ) => {
    if (useBasemap) mapRef.current?.redraw();
    drawCompositeFrame({
      canvas,
      frame: journeyFrame,
      camera: cameraState,
      useBasemap,
      basemapCanvas: mapRef.current?.getCanvas(),
      projectBasemap,
      projectMinimal,
      settings,
      period,
      track,
    });
  }, [mapRef, period, projectBasemap, projectMinimal, settings, track]);

  const {
    exportCanvasRef,
    status: exportStatus,
    progress: exportProgress,
    message: exportMessage,
    outputUrl,
    outputExtension,
    formatLabel,
    createVideo,
    cancel: cancelExport,
    download: downloadVideo,
  } = useJourneyRecorder({
    track,
    settings,
    audioSource: source,
    hasJourney: track.steps.length > 0,
    stopPlayback,
    basemapIsRecordable: () => basemapIsRecordable(settings.mapMode),
    prepareBasemapCapture,
    restoreBasemapCapture,
    onFallback: () => setMapFallback(true),
    onFrame: updateMapFrame,
    drawFrame: renderFrame,
  });

  const chooseCustomAudio = (file?: File) => {
    if (!file) return;
    if (customAudioUrlRef.current) URL.revokeObjectURL(customAudioUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    customAudioUrlRef.current = nextUrl;
    setCustomAudioUrl(nextUrl);
    setCustomAudioName(file.name);
    setSettings((current) => ({ ...current, soundtrackId: "upload" }));
  };

  const closeStudio = useCallback(() => {
    stopPlayback();
    cancelExport();
    onClose();
  }, [cancelExport, onClose, stopPlayback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeStudio();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeStudio]);

  useEffect(() => () => {
    if (customAudioUrlRef.current) URL.revokeObjectURL(customAudioUrlRef.current);
  }, []);

  return (
    <div className="studio-overlay" role="dialog" aria-modal="true" aria-labelledby="studio-title">
      <header className="studio-header">
        <div>
          <span className="studio-kicker">Journey Video Studio</span>
          <h1 id="studio-title">Create a moving memory.</h1>
        </div>
        <button type="button" className="studio-close" onClick={closeStudio} aria-label="Close video studio">x</button>
      </header>
      <div className="studio-body">
        <JourneyPreview
          settings={settings}
          track={track}
          frame={frame}
          period={period}
          progress={progress}
          playing={playing}
          mapReady={mapReady}
          mapFallback={mapFallback}
          mapContainerRef={mapContainerRef}
          minimalCanvasRef={minimalPreviewCanvasRef}
          onRestart={restart}
          onToggle={togglePlayback}
          onSeek={seek}
        />
        <aside className="studio-controls">
          <JourneyControls settings={settings} setSettings={setSettings} period={period} />
          <SoundtrackPicker
            settings={settings}
            customAudioName={customAudioName}
            onSoundtrack={(soundtrackId) => setSettings((current) => ({ ...current, soundtrackId }))}
            onUpload={chooseCustomAudio}
            onVolume={(volume) => setSettings((current) => ({ ...current, volume }))}
          />
          <VideoExportPanel
            mapMode={settings.mapMode}
            formatLabel={formatLabel}
            qualityLabel={qualityLabel}
            status={exportStatus}
            progress={exportProgress}
            message={exportMessage}
            outputUrl={outputUrl}
            outputExtension={outputExtension}
            hasJourney={track.steps.length > 0}
            onMapMode={(mapMode) => setSettings((current) => ({ ...current, mapMode }))}
            onCreate={() => void createVideo()}
            onCancel={cancelExport}
            onDownload={downloadVideo}
          />
        </aside>
      </div>
      <canvas ref={exportCanvasRef} className="studio-export-canvas" aria-hidden="true" />
    </div>
  );
}
