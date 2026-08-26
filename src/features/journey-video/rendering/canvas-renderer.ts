import type { Position } from "@/core/timeline";
import type { JourneyFrame, JourneyTrack } from "../model/journey-track";
import type { JourneyCameraState, JourneyVideoSettings } from "../model/video-settings";
import { createCameraProjector, drawJourneyMarker, drawMinimalMap, type CanvasPoint, type MinimalProjector } from "./minimal-map-renderer";

const drawCover = (context: CanvasRenderingContext2D, source: HTMLCanvasElement, width: number, height: number) => {
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const scale = Math.max(width / source.width, height / source.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.drawImage(source, (source.width - sourceWidth) / 2, (source.height - sourceHeight) / 2, sourceWidth, sourceHeight, 0, 0, width, height);
};

interface CompositeFrameOptions {
  canvas: HTMLCanvasElement;
  frame: JourneyFrame;
  camera: JourneyCameraState;
  useBasemap: boolean;
  basemapCanvas?: HTMLCanvasElement;
  projectBasemap?: (position: Position, width: number, height: number) => CanvasPoint;
  projectMinimal: MinimalProjector;
  settings: JourneyVideoSettings;
  period: string;
  track: JourneyTrack;
}

export const drawCompositeFrame = (options: CompositeFrameOptions) => {
  const { canvas, frame, camera, useBasemap, basemapCanvas, projectBasemap, projectMinimal, settings, period, track } = options;
  const context = canvas.getContext("2d");
  if (!context) return;
  const { width, height } = canvas;
  const overview = camera.phase === "overview";
  const cameraProjector = createCameraProjector(projectMinimal, frame.position, camera);
  context.clearRect(0, 0, width, height);
  if (useBasemap && basemapCanvas?.width && basemapCanvas.height) drawCover(context, basemapCanvas, width, height);
  else drawMinimalMap(context, width, height, overview ? { ...track.frameAt(1), completedPaths: track.movements.map((step) => step.path), activePath: [] } : frame, cameraProjector);

  const topShade = context.createLinearGradient(0, 0, 0, height * 0.3);
  topShade.addColorStop(0, "rgba(23,44,36,.78)"); topShade.addColorStop(1, "rgba(23,44,36,0)");
  context.fillStyle = topShade; context.fillRect(0, 0, width, height * 0.32);
  const bottomShade = context.createLinearGradient(0, height * 0.62, 0, height);
  bottomShade.addColorStop(0, "rgba(23,44,36,0)"); bottomShade.addColorStop(1, "rgba(23,44,36,.9)");
  context.fillStyle = bottomShade; context.fillRect(0, height * 0.6, width, height * 0.4);

  const margin = width * 0.065;
  context.fillStyle = "#f3f0e7";
  context.font = `600 ${Math.round(width * 0.062)}px Georgia, serif`;
  context.fillText(settings.title || "My journey", margin, margin * 1.45, width - margin * 2);
  context.font = `700 ${Math.round(width * 0.021)}px Arial, sans-serif`;
  context.fillStyle = "rgba(243,240,231,.78)";
  context.fillText(settings.subtitle || period, margin, margin * 2.05, width - margin * 2);

  if (frame.position) {
    const marker = useBasemap && projectBasemap
      ? projectBasemap(frame.position, width, height)
      : cameraProjector(frame.position, width, height);
    drawJourneyMarker(context, marker, width);
  }
  context.fillStyle = "#f3f0e7";
  context.font = `600 ${Math.round(width * 0.032)}px Georgia, serif`;
  context.fillText(overview ? "Journey complete" : frame.currentLabel, margin, height - margin * 2.15, width - margin * 2);
  context.font = `700 ${Math.round(width * 0.019)}px Arial, sans-serif`;
  context.fillStyle = "rgba(243,240,231,.76)";
  context.fillText(`${track.totalDistanceKm.toFixed(track.totalDistanceKm < 100 ? 1 : 0)} km mapped  ·  ${track.visits.length} visits`, margin, height - margin * 1.55, width - margin * 2);
  context.fillStyle = "rgba(243,240,231,.28)"; context.fillRect(margin, height - margin * 0.72, width - margin * 2, Math.max(5, height * 0.004));
  context.fillStyle = "#d8ff5f"; context.fillRect(margin, height - margin * 0.72, (width - margin * 2) * frame.progress, Math.max(5, height * 0.004));
  context.font = `700 ${Math.round(width * 0.014)}px Arial, sans-serif`; context.fillStyle = "rgba(243,240,231,.7)";
  context.fillText("TIMELINE MAP VISUALIZER", margin, height - margin * 0.28);
};
