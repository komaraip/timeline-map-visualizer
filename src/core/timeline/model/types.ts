export type Position = [longitude: number, latitude: number];

export type SourceFormat =
  | "device-timeline"
  | "legacy-semantic"
  | "legacy-records";

export type PathQuality = "recorded" | "simplified" | "endpoints";

interface BaseEvent {
  id: string;
  sourceFormat: SourceFormat;
}

export interface VisitEvent extends BaseEvent {
  kind: "visit";
  startMs: number;
  endMs?: number;
  position: Position;
  label: string;
  address?: string;
  placeId?: string;
}

export interface MovementEvent extends BaseEvent {
  kind: "movement";
  startMs: number;
  endMs?: number;
  activityType: string;
  path: Position[];
  pathQuality: PathQuality;
}

export interface SampleEvent extends BaseEvent {
  kind: "sample";
  timestampMs: number;
  position: Position;
  accuracy?: number;
  activityType?: string;
}

export type TimelineEvent = VisitEvent | MovementEvent | SampleEvent;

export const eventTime = (event: TimelineEvent) =>
  event.kind === "sample" ? event.timestampMs : event.startMs;
