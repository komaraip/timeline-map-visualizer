import type { MovementEvent, Position, TimelineEvent, VisitEvent } from "../../model/types";
import { array, idFor, parseE7Position, parseTimestamp, record, stringValue, titleCase, warnInvalid } from "../normalize";
import type { ParserContext } from "../types";

export const parseLegacyTimelineObject = (input: unknown, context: ParserContext): TimelineEvent | undefined => {
  const item = record(input);
  if (item.placeVisit) {
    const visit = record(item.placeVisit);
    const duration = record(visit.duration);
    const startMs = parseTimestamp(duration.startTimestamp ?? duration.startTimestampMs);
    const position = parseE7Position(visit.location);
    if (startMs === undefined || !position) { warnInvalid(context, startMs === undefined ? "timestamp" : "coordinate"); return undefined; }
    const location = record(visit.location);
    return { kind: "visit", id: idFor("legacy-semantic", "visit", startMs, [position]), sourceFormat: "legacy-semantic", startMs, endMs: parseTimestamp(duration.endTimestamp ?? duration.endTimestampMs), position, label: stringValue(location.name) || titleCase(stringValue(location.semanticType)) || "Unnamed visit", address: stringValue(location.address), placeId: stringValue(location.placeId) } satisfies VisitEvent;
  }
  if (item.activitySegment) {
    const movement = record(item.activitySegment);
    const duration = record(movement.duration);
    const startMs = parseTimestamp(duration.startTimestamp ?? duration.startTimestampMs);
    if (startMs === undefined) { warnInvalid(context, "timestamp"); return undefined; }
    const simplified = array(record(movement.simplifiedRawPath).points).map(parseE7Position).filter(Boolean) as Position[];
    const waypoints = array(record(movement.waypointPath).waypoints).map(parseE7Position).filter(Boolean) as Position[];
    const endpoints = [parseE7Position(movement.startLocation), parseE7Position(movement.endLocation)].filter(Boolean) as Position[];
    const path = simplified.length ? simplified : waypoints.length ? waypoints : endpoints;
    if (!path.length) { warnInvalid(context, "coordinate"); return undefined; }
    return { kind: "movement", id: idFor("legacy-semantic", "movement", startMs, path), sourceFormat: "legacy-semantic", startMs, endMs: parseTimestamp(duration.endTimestamp ?? duration.endTimestampMs), activityType: titleCase(stringValue(movement.activityType)), path, pathQuality: simplified.length ? "simplified" : waypoints.length ? "recorded" : "endpoints" } satisfies MovementEvent;
  }
  return undefined;
};
