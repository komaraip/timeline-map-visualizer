import { distanceKm, eventTime, pathDistanceKm, type MovementEvent, type Position, type TimelineEvent, type VisitEvent } from "@/core/timeline";

export interface JourneyMovementStep {
  kind: "movement";
  id: string;
  startMs: number;
  endMs: number;
  activityType: string;
  path: Position[];
  distanceKm: number;
  weight: number;
}

export interface JourneyVisitStep {
  kind: "visit";
  id: string;
  startMs: number;
  endMs: number;
  position: Position;
  label: string;
  weight: number;
}

export type JourneyStep = JourneyMovementStep | JourneyVisitStep;

export interface JourneyBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface JourneyFrame {
  progress: number;
  position?: Position;
  timestampMs: number;
  activeStep?: JourneyStep;
  completedPaths: Position[][];
  activePath: Position[];
  currentLabel: string;
}

export interface JourneyTrack {
  steps: JourneyStep[];
  movements: JourneyMovementStep[];
  visits: JourneyVisitStep[];
  totalDistanceKm: number;
  totalWeight: number;
  bounds?: JourneyBounds;
  startMs: number;
  endMs: number;
  frameAt: (progress: number) => JourneyFrame;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const normalizeLongitude = (longitude: number) => ((longitude + 540) % 360) - 180;

const interpolatePosition = (a: Position, b: Position, progress: number): Position => {
  let longitudeDelta = b[0] - a[0];
  if (longitudeDelta > 180) longitudeDelta -= 360;
  if (longitudeDelta < -180) longitudeDelta += 360;
  return [normalizeLongitude(a[0] + longitudeDelta * progress), a[1] + (b[1] - a[1]) * progress];
};

const slicePathAt = (path: Position[], progress: number) => {
  if (!path.length) return { path: [] as Position[], position: undefined };
  if (path.length === 1 || progress <= 0) return { path: [path[0]], position: path[0] };
  if (progress >= 1) return { path: [...path], position: path.at(-1) };

  const distances = path.slice(1).map((point, index) => distanceKm(path[index], point));
  const total = distances.reduce((sum, value) => sum + value, 0);
  if (!total) return { path: [path[0]], position: path[0] };
  const target = total * progress;
  let traveled = 0;
  const visible: Position[] = [path[0]];
  for (let index = 0; index < distances.length; index += 1) {
    const segmentDistance = distances[index];
    if (traveled + segmentDistance >= target) {
      const localProgress = segmentDistance ? (target - traveled) / segmentDistance : 0;
      const position = interpolatePosition(path[index], path[index + 1], localProgress);
      visible.push(position);
      return { path: visible, position };
    }
    traveled += segmentDistance;
    visible.push(path[index + 1]);
  }
  return { path: visible, position: path.at(-1) };
};

const computeBounds = (positions: Position[]): JourneyBounds | undefined => {
  if (!positions.length) return undefined;
  const latitudes = positions.map((position) => position[1]);
  const circular = positions.map((position) => (position[0] + 360) % 360).sort((a, b) => a - b);
  let gapIndex = circular.length - 1;
  let largestGap = circular[0] + 360 - circular.at(-1)!;
  for (let index = 0; index < circular.length - 1; index += 1) {
    const gap = circular[index + 1] - circular[index];
    if (gap > largestGap) { largestGap = gap; gapIndex = index; }
  }
  const intervalStart = circular[(gapIndex + 1) % circular.length];
  const width = 360 - largestGap;
  const west = normalizeLongitude(intervalStart);
  return {
    west,
    south: Math.min(...latitudes),
    east: west + width,
    north: Math.max(...latitudes),
  };
};

const movementStep = (event: MovementEvent): JourneyMovementStep | undefined => {
  if (event.path.length < 2) return undefined;
  const distance = pathDistanceKm(event.path);
  return {
    kind: "movement",
    id: event.id,
    startMs: event.startMs,
    endMs: Math.max(event.startMs, event.endMs ?? event.startMs),
    activityType: event.activityType,
    path: event.path,
    distanceKm: distance,
    weight: Math.max(0.5, Math.sqrt(Math.max(distance, 0.01))),
  };
};

const visitStep = (event: VisitEvent, weight: number): JourneyVisitStep => ({
  kind: "visit",
  id: event.id,
  startMs: event.startMs,
  endMs: Math.max(event.startMs, event.endMs ?? event.startMs),
  position: event.position,
  label: event.label,
  weight,
});

export const buildJourneyTrack = (events: TimelineEvent[]): JourneyTrack => {
  const sorted = [...events].sort((a, b) => eventTime(a) - eventTime(b));
  const movementEvents = sorted.filter((event): event is MovementEvent => event.kind === "movement");
  const baseMovements = movementEvents.map(movementStep).filter((step): step is JourneyMovementStep => Boolean(step));
  const movementWeight = baseMovements.reduce((sum, step) => sum + step.weight, 0);
  const pauseWeight = Math.max(0.12, movementWeight * 0.018);
  const steps = sorted.flatMap<JourneyStep>((event) => {
    if (event.kind === "movement") {
      const step = movementStep(event);
      return step ? [step] : [];
    }
    return event.kind === "visit" ? [visitStep(event, pauseWeight)] : [];
  });
  const movements = steps.filter((step): step is JourneyMovementStep => step.kind === "movement");
  const visits = steps.filter((step): step is JourneyVisitStep => step.kind === "visit");
  const positions = steps.flatMap((step) => step.kind === "movement" ? step.path : [step.position]);
  const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);
  const startMs = steps[0]?.startMs ?? 0;
  const endMs = steps.at(-1)?.endMs ?? startMs;

  const frameAt = (inputProgress: number): JourneyFrame => {
    const progress = clamp(inputProgress);
    if (!steps.length || !totalWeight) return { progress, timestampMs: 0, completedPaths: [], activePath: [], currentLabel: "No mapped journey" };
    const target = totalWeight * progress;
    let cursor = 0;
    const completedPaths: Position[][] = [];
    for (const step of steps) {
      const next = cursor + step.weight;
      if (target <= next || step === steps.at(-1)) {
        const localProgress = clamp((target - cursor) / step.weight);
        if (step.kind === "movement") {
          const visible = slicePathAt(step.path, localProgress);
          return {
            progress,
            position: visible.position,
            timestampMs: step.startMs + (step.endMs - step.startMs) * localProgress,
            activeStep: step,
            completedPaths,
            activePath: visible.path,
            currentLabel: step.activityType,
          };
        }
        return {
          progress,
          position: step.position,
          timestampMs: step.startMs + (step.endMs - step.startMs) * localProgress,
          activeStep: step,
          completedPaths,
          activePath: [],
          currentLabel: step.label,
        };
      }
      if (step.kind === "movement") completedPaths.push(step.path);
      cursor = next;
    }
    return { progress, timestampMs: endMs, completedPaths, activePath: [], currentLabel: "Journey complete" };
  };

  return {
    steps,
    movements,
    visits,
    totalDistanceKm: movements.reduce((sum, step) => sum + step.distanceKm, 0),
    totalWeight,
    bounds: computeBounds(positions),
    startMs,
    endMs,
    frameAt,
  };
};

