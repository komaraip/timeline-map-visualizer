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

export interface ImportWarning {
  code: "INVALID_JSON" | "INVALID_TIMESTAMP" | "INVALID_COORDINATE" | "UNSUPPORTED_FORMAT" | "EMPTY_FILE" | "LIMIT_EXCEEDED";
  message: string;
  count: number;
}

export interface ImportReport {
  formats: SourceFormat[];
  accepted: number;
  skipped: number;
  duplicates: number;
  ignoredFiles: number;
  warnings: ImportWarning[];
}

export interface ParserContext {
  sourceName: string;
  warn: (code: ImportWarning["code"], message: string) => void;
}

export interface ParserMetadata {
  rootKey: string;
  sourceName: string;
}

export interface TimelineParser {
  format: SourceFormat;
  canParse: (metadata: ParserMetadata) => boolean;
  parse: (
    stream: ReadableStream<Uint8Array>,
    context: ParserContext,
  ) => AsyncIterable<TimelineEvent[]>;
}

export const emptyImportReport = (): ImportReport => ({
  formats: [],
  accepted: 0,
  skipped: 0,
  duplicates: 0,
  ignoredFiles: 0,
  warnings: [],
});

export const eventTime = (event: TimelineEvent) =>
  event.kind === "sample" ? event.timestampMs : event.startMs;
