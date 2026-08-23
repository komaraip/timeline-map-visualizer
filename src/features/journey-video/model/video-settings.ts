export type VideoAspectRatio = "portrait" | "square" | "landscape";
export type VideoResolution = "standard" | "hd";
export type VideoMapMode = "basemap" | "minimal";
export type SoundtrackId = "ambient-drift" | "bright-miles" | "cinematic-rise" | "none" | "upload";
export type ExportStatus = "idle" | "preparing" | "recording" | "finalizing" | "complete" | "cancelled" | "error";
export const ENDING_SECONDS = 1.5;

export interface JourneyVideoSettings {
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  durationSec: 10 | 15 | 30 | 60;
  title: string;
  subtitle: string;
  soundtrackId: SoundtrackId;
  volume: number;
  fps: 30;
  mapMode: VideoMapMode;
}

export const DEFAULT_VIDEO_SETTINGS: JourneyVideoSettings = {
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

export const videoDimensions = (aspectRatio: VideoAspectRatio, resolution: VideoResolution) => {
  const hd = resolution === "hd";
  if (aspectRatio === "portrait") return { width: hd ? 1080 : 720, height: hd ? 1920 : 1280 };
  if (aspectRatio === "square") return { width: hd ? 1080 : 720, height: hd ? 1080 : 720 };
  return { width: hd ? 1920 : 1280, height: hd ? 1080 : 720 };
};
