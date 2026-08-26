import type { Position } from "@/core/timeline";
import type { JourneyBounds, JourneyFrame } from "../model/journey-track";
import type { JourneyCameraState } from "../model/video-settings";

export type CanvasPoint = { x: number; y: number };
export type MinimalProjector = (position: Position, width: number, height: number) => CanvasPoint;

const easeInOutCubic = (progress: number) => progress < 0.5
  ? 4 * progress * progress * progress
  : 1 - Math.pow(-2 * progress + 2, 3) / 2;

export const createMinimalProjector = (bounds?: JourneyBounds): MinimalProjector =>
  (position, width, height) => {
    if (!bounds) return { x: width / 2, y: height / 2 };
    let longitude = position[0];
    while (longitude < bounds.west) longitude += 360;
    while (longitude > bounds.east && longitude - 360 >= bounds.west) longitude -= 360;
    const longitudeSpan = Math.max(0.0001, bounds.east - bounds.west);
    const latitudeSpan = Math.max(0.0001, bounds.north - bounds.south);
    return {
      x: width * (0.1 + 0.8 * (longitude - bounds.west) / longitudeSpan),
      y: height * (0.9 - 0.8 * (position[1] - bounds.south) / latitudeSpan),
    };
  };

export const createCameraProjector = (
  project: MinimalProjector,
  focus: Position | undefined,
  camera: JourneyCameraState,
  followScale = 2,
): MinimalProjector => (position, width, height) => {
  const point = project(position, width, height);
  if (!focus || camera.phase === "idle") return point;
  const eased = easeInOutCubic(camera.progress);
  const focusAmount = camera.phase === "intro"
    ? eased
    : camera.phase === "overview"
      ? 1 - eased
      : 1;
  const scale = camera.phase === "intro"
    ? 1 + (followScale - 1) * eased
    : camera.phase === "overview"
      ? followScale + (1 - followScale) * eased
      : followScale;
  const focusPoint = project(focus, width, height);
  const cameraX = width / 2 + (focusPoint.x - width / 2) * focusAmount;
  const cameraY = height / 2 + (focusPoint.y - height / 2) * focusAmount;
  return {
    x: width / 2 + (point.x - cameraX) * scale,
    y: height / 2 + (point.y - cameraY) * scale,
  };
};

export const drawJourneyMarker = (
  context: CanvasRenderingContext2D,
  point: CanvasPoint,
  width: number,
) => {
  context.beginPath();
  context.arc(point.x, point.y, Math.max(7, width * 0.018), 0, Math.PI * 2);
  context.fillStyle = "#172c24";
  context.fill();
  context.lineWidth = Math.max(3, width * 0.007);
  context.strokeStyle = "#d8ff5f";
  context.stroke();
};

export const drawMinimalMap = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: JourneyFrame,
  project: MinimalProjector,
) => {
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#c7dacf");
  background.addColorStop(1, "#e2e4d5");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  const drawPaths = (paths: Position[][], color: string, alpha: number, lineWidth: number) => {
    context.save();
    context.strokeStyle = color;
    context.globalAlpha = alpha;
    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const path of paths) {
      if (path.length < 2) continue;
      context.beginPath();
      path.forEach((position, index) => {
        const point = project(position, width, height);
        if (!index) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.stroke();
    }
    context.restore();
  };
  drawPaths(frame.completedPaths, "#ff7145", 0.45, Math.max(4, width / 140));
  drawPaths(frame.activePath.length ? [frame.activePath] : [], "#d8ff5f", 1, Math.max(7, width / 90));
};
