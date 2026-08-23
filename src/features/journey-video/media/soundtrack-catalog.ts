import type { SoundtrackId } from "../model/video-settings";

export interface Soundtrack {
  id: SoundtrackId;
  label: string;
  description: string;
  src?: string;
}

export const SOUNDTRACKS: Soundtrack[] = [
  { id: "ambient-drift", label: "Ambient Drift", description: "Soft pads and a patient pulse", src: "audio/ambient-drift.wav" },
  { id: "bright-miles", label: "Bright Miles", description: "Warm, upbeat travel rhythm", src: "audio/bright-miles.wav" },
  { id: "cinematic-rise", label: "Cinematic Rise", description: "Wide chords and a bold finish", src: "audio/cinematic-rise.wav" },
  { id: "none", label: "No music", description: "Map animation only" },
  { id: "upload", label: "Upload your own", description: "Local audio from this device" },
];

export const soundtrackSource = (soundtrackId: SoundtrackId, customUrl?: string) => {
  if (soundtrackId === "none") return "";
  if (soundtrackId === "upload") return customUrl || "";
  const soundtrack = SOUNDTRACKS.find((item) => item.id === soundtrackId);
  return soundtrack?.src ? new URL(soundtrack.src, document.baseURI).toString() : "";
};
