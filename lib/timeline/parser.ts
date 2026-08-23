import type {
  MovementEvent,
  ParserContext,
  Position,
  SampleEvent,
  SourceFormat,
  TimelineEvent,
  VisitEvent,
} from "./types";

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const numberValue = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseTimestamp = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (/^\d+$/.test(value)) {
    const numeric = Number(value);
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseLatLng = (value: unknown): Position | undefined => {
  if (Array.isArray(value) && value.length >= 2) {
    const first = numberValue(value[0]);
    const second = numberValue(value[1]);
    if (first !== undefined && second !== undefined) {
      const position: Position = [first, second];
      return validPosition(position) ? position : undefined;
    }
  }
  if (typeof value !== "string") return undefined;
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return undefined;
  const latitude = Number(matches[0]);
  const longitude = Number(matches[1]);
  const position: Position = [longitude, latitude];
  return validPosition(position) ? position : undefined;
};

export const parseE7Position = (value: unknown): Position | undefined => {
  const candidate = record(value);
  const latitudeE7 = numberValue(candidate.latitudeE7);
  const longitudeE7 = numberValue(candidate.longitudeE7);
  const latitude = latitudeE7 !== undefined ? latitudeE7 / 1e7 : numberValue(candidate.latitude);
  const longitude = longitudeE7 !== undefined ? longitudeE7 / 1e7 : numberValue(candidate.longitude);
  if (latitude === undefined || longitude === undefined) return undefined;
  const position: Position = [longitude, latitude];
  return validPosition(position) ? position : undefined;
};

const validPosition = ([longitude, latitude]: Position) =>
  longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;

const titleCase = (value?: string) =>
  (value || "Unknown")
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const idFor = (format: SourceFormat, kind: string, time: number, positions: Position[]) =>
  `${format}-${kind}-${stableHash(`${time}|${positions.map((point) => point.join(",")).join("|")}`)}`;

const warnInvalid = (context: ParserContext, type: "timestamp" | "coordinate") => {
  context.warn(
    type === "timestamp" ? "INVALID_TIMESTAMP" : "INVALID_COORDINATE",
    type === "timestamp"
      ? "One or more entries had an invalid timestamp and were skipped."
      : "One or more entries had invalid coordinates and were skipped.",
  );
};

export const parseDeviceSegment = (
  input: unknown,
  context: ParserContext,
): TimelineEvent | undefined => {
  const segment = record(input);
  const startMs = parseTimestamp(segment.startTime);
  const endMs = parseTimestamp(segment.endTime);
  if (startMs === undefined) {
    warnInvalid(context, "timestamp");
    return undefined;
  }

  if (segment.visit) {
    const candidate = record(record(segment.visit).topCandidate);
    const position = parseLatLng(record(candidate.placeLocation).latLng);
    if (!position) {
      warnInvalid(context, "coordinate");
      return undefined;
    }
    const semanticType = stringValue(candidate.semanticType);
    const placeId = stringValue(candidate.placeId);
    return {
      kind: "visit",
      id: idFor("device-timeline", "visit", startMs, [position]),
      sourceFormat: "device-timeline",
      startMs,
      endMs,
      position,
      label: titleCase(semanticType) || placeId || "Unnamed visit",
      placeId,
    } satisfies VisitEvent;
  }

  if (segment.activity) {
    const activity = record(segment.activity);
    const start = parseLatLng(record(activity.start).latLng);
    const end = parseLatLng(record(activity.end).latLng);
    const path = [start, end].filter(Boolean) as Position[];
    if (!path.length) {
      warnInvalid(context, "coordinate");
      return undefined;
    }
    return {
      kind: "movement",
      id: idFor("device-timeline", "movement", startMs, path),
      sourceFormat: "device-timeline",
      startMs,
      endMs,
      activityType: titleCase(stringValue(record(activity.topCandidate).type)),
      path,
      pathQuality: "endpoints",
    } satisfies MovementEvent;
  }

  if (segment.timelinePath) {
    const pathEntries = array(segment.timelinePath);
    const path = pathEntries
      .map((entry) => parseLatLng(record(entry).point))
      .filter(Boolean) as Position[];
    if (!path.length) {
      warnInvalid(context, "coordinate");
      return undefined;
    }
    return {
      kind: "movement",
      id: idFor("device-timeline", "path", startMs, path),
      sourceFormat: "device-timeline",
      startMs,
      endMs: endMs ?? parseTimestamp(record(pathEntries.at(-1)).time),
      activityType: "Timeline path",
      path,
      pathQuality: "recorded",
    } satisfies MovementEvent;
  }

  return undefined;
};

export const parseLegacyTimelineObject = (
  input: unknown,
  context: ParserContext,
): TimelineEvent | undefined => {
  const item = record(input);
  if (item.placeVisit) {
    const visit = record(item.placeVisit);
    const duration = record(visit.duration);
    const startMs = parseTimestamp(duration.startTimestamp ?? duration.startTimestampMs);
    const position = parseE7Position(visit.location);
    if (startMs === undefined || !position) {
      warnInvalid(context, startMs === undefined ? "timestamp" : "coordinate");
      return undefined;
    }
    const location = record(visit.location);
    return {
      kind: "visit",
      id: idFor("legacy-semantic", "visit", startMs, [position]),
      sourceFormat: "legacy-semantic",
      startMs,
      endMs: parseTimestamp(duration.endTimestamp ?? duration.endTimestampMs),
      position,
      label: stringValue(location.name) || titleCase(stringValue(location.semanticType)) || "Unnamed visit",
      address: stringValue(location.address),
      placeId: stringValue(location.placeId),
    } satisfies VisitEvent;
  }

  if (item.activitySegment) {
    const movement = record(item.activitySegment);
    const duration = record(movement.duration);
    const startMs = parseTimestamp(duration.startTimestamp ?? duration.startTimestampMs);
    if (startMs === undefined) {
      warnInvalid(context, "timestamp");
      return undefined;
    }
    const simplified = array(record(movement.simplifiedRawPath).points).map(parseE7Position).filter(Boolean) as Position[];
    const waypoints = array(record(movement.waypointPath).waypoints).map(parseE7Position).filter(Boolean) as Position[];
    const endpoints = [parseE7Position(movement.startLocation), parseE7Position(movement.endLocation)].filter(Boolean) as Position[];
    const path = simplified.length ? simplified : waypoints.length ? waypoints : endpoints;
    if (!path.length) {
      warnInvalid(context, "coordinate");
      return undefined;
    }
    return {
      kind: "movement",
      id: idFor("legacy-semantic", "movement", startMs, path),
      sourceFormat: "legacy-semantic",
      startMs,
      endMs: parseTimestamp(duration.endTimestamp ?? duration.endTimestampMs),
      activityType: titleCase(stringValue(movement.activityType)),
      path,
      pathQuality: simplified.length ? "simplified" : waypoints.length ? "recorded" : "endpoints",
    } satisfies MovementEvent;
  }
  return undefined;
};

export const parseRawLocation = (
  input: unknown,
  context: ParserContext,
): TimelineEvent | undefined => {
  const location = record(input);
  const timestampMs = parseTimestamp(location.timestamp ?? location.timestampMs);
  const position = parseE7Position(location) ?? parseLatLng(record(location.location).latLng);
  if (timestampMs === undefined || !position) {
    warnInvalid(context, timestampMs === undefined ? "timestamp" : "coordinate");
    return undefined;
  }
  const activityBlock = record(array(location.activity)[0]);
  const activityType = stringValue(record(array(activityBlock.activity)[0]).type);
  return {
    kind: "sample",
    id: idFor("legacy-records", "sample", timestampMs, [position]),
    sourceFormat: "legacy-records",
    timestampMs,
    position,
    accuracy: numberValue(location.accuracy),
    activityType: activityType ? titleCase(activityType) : undefined,
  } satisfies SampleEvent;
};

export const detectSourceFormat = (rootKey: string): SourceFormat | undefined => {
  if (rootKey === "semanticSegments") return "device-timeline";
  if (rootKey === "timelineObjects") return "legacy-semantic";
  if (rootKey === "locations") return "legacy-records";
  return undefined;
};

export const parserForFormat = (format: SourceFormat) => {
  if (format === "device-timeline") return parseDeviceSegment;
  if (format === "legacy-semantic") return parseLegacyTimelineObject;
  return parseRawLocation;
};

export const normalizeRoot = (
  root: unknown,
  context: ParserContext,
): { format?: SourceFormat; events: TimelineEvent[] } => {
  const input = record(root);
  const rootKey = ["semanticSegments", "timelineObjects", "locations"].find((key) => Array.isArray(input[key]));
  if (!rootKey) return { events: [] };
  const format = detectSourceFormat(rootKey);
  if (!format) return { events: [] };
  const parse = parserForFormat(format);
  return {
    format,
    events: array(input[rootKey]).map((entry) => parse(entry, context)).filter(Boolean) as TimelineEvent[],
  };
};
