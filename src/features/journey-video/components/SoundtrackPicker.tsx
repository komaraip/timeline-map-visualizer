import { useRef } from "react";
import { SOUNDTRACKS } from "../media/soundtrack-catalog";
import type { JourneyVideoSettings, SoundtrackId } from "../model/video-settings";

interface SoundtrackPickerProps {
  settings: JourneyVideoSettings;
  customAudioName: string;
  onSoundtrack: (id: SoundtrackId) => void;
  onUpload: (file?: File) => void;
  onVolume: (volume: number) => void;
}

export function SoundtrackPicker(props: SoundtrackPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <section>
      <div className="studio-section-title"><span>03</span><strong>Soundtrack</strong></div>
      <div className="soundtrack-list">{SOUNDTRACKS.map((soundtrack) => <button type="button" key={soundtrack.id} className={props.settings.soundtrackId === soundtrack.id ? "active" : ""} onClick={() => soundtrack.id === "upload" ? fileInputRef.current?.click() : props.onSoundtrack(soundtrack.id)}><i>{soundtrack.id === "none" ? "—" : soundtrack.id === "upload" ? "+" : "♫"}</i><span><strong>{soundtrack.id === "upload" && props.customAudioName ? props.customAudioName : soundtrack.label}</strong><small>{soundtrack.description}</small></span></button>)}</div>
      <input ref={fileInputRef} hidden type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg,.mp3,.wav,.m4a,.aac,.ogg" onChange={(event) => props.onUpload(event.target.files?.[0])} />
      <label>Music volume <output>{Math.round(props.settings.volume * 100)}%</output><input type="range" min="0" max="1" step="0.05" value={props.settings.volume} onChange={(event) => props.onVolume(Number(event.target.value))} /></label>
    </section>
  );
}
