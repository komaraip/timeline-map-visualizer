export type VideoAspectRatio = "portrait" | "square" | "landscape";
export type VideoResolution = "standard" | "hd";
export type VideoMapMode = "basemap" | "minimal";
export type SoundtrackId = "ambient-drift" | "bright-miles" | "cinematic-rise" | "none" | "upload";
export type ExportStatus = "idle" | "preparing" | "recording" | "finalizing" | "complete" | "cancelled" | "error";
export type JourneyCameraPhase = "idle" | "intro" | "follow" | "overview";

export interface JourneyCameraState {
  phase: JourneyCameraPhase;
  progress: number;
}

export const INTRO_SECONDS = 1.4;
export const ENDING_SECONDS = 1.5;
export const IDLE_CAMERA: JourneyCameraState = { phase: "idle", progress: 0 };

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export const journeyVideoSeconds = (durationSec: number) => INTRO_SECONDS + durationSec + ENDING_SECONDS;

export const journeyPresentationAt = (elapsedSeconds: number, durationSec: number) => {
  if (elapsedSeconds < INTRO_SECONDS) {
    return {
      routeProgress: 0,
      camera: { phase: "intro", progress: clamp(elapsedSeconds / INTRO_SECONDS) } satisfies JourneyCameraState,
    };
  }
  const journeyElapsed = elapsedSeconds - INTRO_SECONDS;
  if (journeyElapsed < durationSec) {
    return {
      routeProgress: clamp(journeyElapsed / durationSec),
      camera: { phase: "follow", progress: clamp(journeyElapsed / durationSec) } satisfies JourneyCameraState,
    };
  }
  return {
    routeProgress: 1,
    camera: {
      phase: "overview",
      progress: clamp((journeyElapsed - durationSec) / ENDING_SECONDS),
    } satisfies JourneyCameraState,
  };
};

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
