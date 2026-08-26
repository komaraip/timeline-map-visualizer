import type { RefObject } from "react";
import type { JourneyFrame, JourneyTrack } from "../model/journey-track";
import type { JourneyVideoSettings } from "../model/video-settings";

interface JourneyPreviewProps {
  settings: JourneyVideoSettings;
  track: JourneyTrack;
  frame: JourneyFrame;
  period: string;
  progress: number;
  playing: boolean;
  mapReady: boolean;
  mapFallback: boolean;
  mapContainerRef: RefObject<HTMLDivElement | null>;
  minimalCanvasRef: RefObject<HTMLCanvasElement | null>;
  onRestart: () => void;
  onToggle: () => void;
  onSeek: (progress: number) => void;
}

export function JourneyPreview({ settings, track, frame, period, progress, playing, mapReady, mapFallback, mapContainerRef, minimalCanvasRef, onRestart, onToggle, onSeek }: JourneyPreviewProps) {
  const privateMap = mapFallback || settings.mapMode === "minimal";
  return (
    <section className="studio-stage" aria-label="Animated journey preview">
      <div className={`studio-preview studio-${settings.aspectRatio}`}>
        <div ref={mapContainerRef} className="studio-map" />
        {(!mapReady || privateMap) && <div className="studio-minimal-preview"><div className="studio-minimal-grid" /><canvas ref={minimalCanvasRef} /><span>{!mapReady && !mapFallback && settings.mapMode !== "minimal" ? "LOADING BASEMAP" : "PRIVATE MAP MODE"}</span></div>}
        <div className="studio-preview-shade studio-preview-shade-top" />
        <div className="studio-preview-shade studio-preview-shade-bottom" />
        <div className="studio-title-card"><strong>{settings.title || "My journey"}</strong><span>{settings.subtitle || period}</span></div>
        <div className="studio-now"><strong>{progress >= 1 ? "Journey complete" : frame.currentLabel}</strong><span>{track.totalDistanceKm.toFixed(track.totalDistanceKm < 100 ? 1 : 0)} km mapped · {track.visits.length} visits</span></div>
        <div className="studio-progress-visual"><i style={{ width: `${progress * 100}%` }} /></div>
      </div>
      <div className="studio-transport">
        <button type="button" onClick={onRestart} aria-label="Restart preview">↺</button>
        <button type="button" className="studio-play" onClick={onToggle} disabled={!track.steps.length}>{playing ? "Pause" : "Play preview"}</button>
        <input aria-label="Journey preview position" type="range" min="0" max="1" step="0.001" value={progress} onChange={(event) => onSeek(Number(event.target.value))} />
        <time>{Math.round(progress * settings.durationSec)}s / {settings.durationSec}s</time>
      </div>
      {!track.movements.length && <p className="studio-notice">This selection has no mapped movement. The video will reveal visits without drawing invented routes.</p>}
    </section>
  );
}
