export type VideoAspectRatio = "portrait" | "square" | "landscape";
export type VideoResolution = "standard" | "hd" | "ultra";
export type VideoFrameRate = 30 | 60;
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
  showJourneyDetails: boolean;
  soundtrackId: SoundtrackId;
  volume: number;
  fps: VideoFrameRate;
  mapMode: VideoMapMode;
}

export const DEFAULT_VIDEO_SETTINGS: JourneyVideoSettings = {
  aspectRatio: "portrait",
  resolution: "hd",
  durationSec: 15,
  title: "My journey",
  subtitle: "",
  showJourneyDetails: true,
  soundtrackId: "ambient-drift",
  volume: 0.7,
  fps: 30,
  mapMode: "basemap",
};

export const videoDimensions = (aspectRatio: VideoAspectRatio, resolution: VideoResolution) => {
  const shortEdge = resolution === "ultra" ? 1440 : resolution === "hd" ? 1080 : 720;
  if (aspectRatio === "portrait") return { width: shortEdge, height: Math.round(shortEdge * 16 / 9) };
  if (aspectRatio === "square") return { width: shortEdge, height: shortEdge };
  return { width: Math.round(shortEdge * 16 / 9), height: shortEdge };
};

export const videoBitrate = (settings: JourneyVideoSettings) => {
  const dimensions = videoDimensions(settings.aspectRatio, settings.resolution);
  const qualityFloor = settings.resolution === "ultra"
    ? 46_000_000
    : settings.resolution === "hd"
      ? 26_000_000
      : 12_000_000;
  const qualityCeiling = settings.resolution === "ultra"
    ? 72_000_000
    : settings.resolution === "hd"
      ? 54_000_000
      : 24_000_000;
  const pixelTarget = dimensions.width * dimensions.height * settings.fps * 0.42;
  const bounded = Math.min(qualityCeiling, Math.max(qualityFloor, pixelTarget));
  return Math.round(bounded / 500_000) * 500_000;
};

export const estimatedVideoSizeMb = (settings: JourneyVideoSettings) => {
  const totalBitsPerSecond = videoBitrate(settings) + 192_000;
  return totalBitsPerSecond * journeyVideoSeconds(settings.durationSec) / 8_000_000;
};
