import type { Dispatch, SetStateAction } from "react";
import type { JourneyVideoSettings, VideoAspectRatio, VideoResolution } from "../model/video-settings";

export function JourneyControls({ settings, setSettings, period }: {
  settings: JourneyVideoSettings;
  setSettings: Dispatch<SetStateAction<JourneyVideoSettings>>;
  period: string;
}) {
  return (
    <>
      <section><div className="studio-section-title"><span>01</span><strong>Story</strong></div><label>Title<input value={settings.title} maxLength={64} onChange={(event) => setSettings((current) => ({ ...current, title: event.target.value }))} /></label><label>Subtitle<input value={settings.subtitle} maxLength={80} placeholder={period} onChange={(event) => setSettings((current) => ({ ...current, subtitle: event.target.value }))} /></label></section>
      <section><div className="studio-section-title"><span>02</span><strong>Canvas</strong></div><div className="studio-choice-grid" aria-label="Video aspect ratio">{([["portrait", "9:16"], ["square", "1:1"], ["landscape", "16:9"]] as Array<[VideoAspectRatio, string]>).map(([value, label]) => <button type="button" key={value} className={settings.aspectRatio === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, aspectRatio: value }))}>{label}</button>)}</div><div className="studio-choice-grid studio-choice-grid-two" aria-label="Video resolution">{([["standard", "720p"], ["hd", "1080p"]] as Array<[VideoResolution, string]>).map(([value, label]) => <button type="button" key={value} className={settings.resolution === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, resolution: value }))}>{label}</button>)}</div><div className="studio-choice-grid studio-choice-grid-four" aria-label="Journey duration">{([10, 15, 30, 60] as const).map((value) => <button type="button" key={value} className={settings.durationSec === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, durationSec: value }))}>{value}s</button>)}</div></section>
    </>
  );
}
