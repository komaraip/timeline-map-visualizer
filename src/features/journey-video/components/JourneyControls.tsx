import type { Dispatch, SetStateAction } from "react";
import type { JourneyVideoSettings, VideoAspectRatio, VideoFrameRate, VideoResolution } from "../model/video-settings";

export function JourneyControls({ settings, setSettings, period }: {
  settings: JourneyVideoSettings;
  setSettings: Dispatch<SetStateAction<JourneyVideoSettings>>;
  period: string;
}) {
  return (
    <>
      <section>
        <div className="studio-section-title"><span>01</span><strong>Story</strong></div>
        <label>Title<input value={settings.title} maxLength={64} onChange={(event) => setSettings((current) => ({ ...current, title: event.target.value }))} /></label>
        <label>Subtitle<input value={settings.subtitle} maxLength={80} placeholder={period} onChange={(event) => setSettings((current) => ({ ...current, subtitle: event.target.value }))} /></label>
        <div className="studio-choice-grid studio-choice-grid-two studio-details-toggle" aria-label="Journey details visibility">
          <button type="button" className={settings.showJourneyDetails ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, showJourneyDetails: true }))}>Show details</button>
          <button type="button" className={!settings.showJourneyDetails ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, showJourneyDetails: false }))}>Hide details</button>
        </div>
      </section>
      <section>
        <div className="studio-section-title"><span>02</span><strong>Canvas</strong></div>
        <div className="studio-choice-grid" aria-label="Video aspect ratio">
          {([["portrait", "9:16"], ["square", "1:1"], ["landscape", "16:9"]] as Array<[VideoAspectRatio, string]>).map(([value, label]) => <button type="button" key={value} className={settings.aspectRatio === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, aspectRatio: value }))}>{label}</button>)}
        </div>
        <div className="studio-choice-grid studio-choice-grid-three" aria-label="Video resolution">
          {([["standard", "720p"], ["hd", "1080p HD"], ["ultra", "1440p"]] as Array<[VideoResolution, string]>).map(([value, label]) => <button type="button" key={value} className={settings.resolution === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, resolution: value, fps: value === "ultra" ? 30 : current.fps }))}>{label}</button>)}
        </div>
        <div className="studio-choice-grid studio-choice-grid-two" aria-label="Video frame rate">
          {([30, 60] as VideoFrameRate[]).map((value) => <button type="button" key={value} disabled={value === 60 && settings.resolution === "ultra"} title={value === 60 && settings.resolution === "ultra" ? "1440p is limited to 30 FPS for browser stability." : undefined} className={settings.fps === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, fps: value }))}>{value === 60 ? "60 FPS smooth" : "30 FPS"}</button>)}
        </div>
        <div className="studio-choice-grid studio-choice-grid-four" aria-label="Journey duration">
          {([10, 15, 30, 60] as const).map((value) => <button type="button" key={value} className={settings.durationSec === value ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, durationSec: value }))}>{value}s</button>)}
        </div>
      </section>
    </>
  );
}
