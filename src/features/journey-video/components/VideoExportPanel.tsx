/* eslint-disable jsx-a11y/media-has-caption -- Generated travel videos contain music but no spoken dialogue. */
import type { ExportStatus } from "../model/video-settings";

interface VideoExportPanelProps {
  formatLabel: string;
  qualityLabel: string;
  status: ExportStatus;
  progress: number;
  message: string;
  outputUrl: string;
  outputExtension: "mp4" | "webm";
  hasJourney: boolean;
  onCreate: () => void;
  onCancel: () => void;
  onDownload: () => void;
}

export function VideoExportPanel(props: VideoExportPanelProps) {
  const working = props.status === "recording" || props.status === "preparing" || props.status === "finalizing";
  return (
    <section>
      <div className="studio-section-title"><span>04</span><strong>Export</strong></div>
      <p className="studio-export-note">Preferred format: <strong>{props.formatLabel}</strong>. Timeline and audio stay in this tab. Basemap tiles may reveal viewed areas to the configured provider.</p>
      <p className="studio-quality-note">{props.qualityLabel}. Actual size and bitrate depend on the browser encoder.</p>
      <button type="button" className="studio-create" disabled={!props.hasJourney || working} onClick={props.onCreate}>{props.status === "recording" ? "Creating video…" : "Create video"}</button>
      {props.status === "recording" && <button type="button" className="studio-cancel" onClick={props.onCancel}>Cancel</button>}
      <div className="studio-export-progress" aria-live="polite"><i style={{ width: `${props.progress * 100}%` }} /><span>{props.message}</span></div>
      {props.outputUrl && <div className="studio-result"><video src={props.outputUrl} controls playsInline muted={false} aria-label="Generated journey video" /><button type="button" onClick={props.onDownload}>Download {props.outputExtension.toUpperCase()}</button></div>}
    </section>
  );
}
