import type { MovementEvent, Position, TimelineEvent, VisitEvent } from "../../model/types";
import { array, idFor, parseLatLng, parseTimestamp, record, stringValue, titleCase, warnInvalid } from "../normalize";
import type { ParserContext } from "../types";

export const parseDeviceSegment = (input: unknown, context: ParserContext): TimelineEvent | undefined => {
  const segment = record(input);
  const startMs = parseTimestamp(segment.startTime);
  const endMs = parseTimestamp(segment.endTime);
  if (startMs === undefined) { warnInvalid(context, "timestamp"); return undefined; }
  if (segment.visit) {
    const candidate = record(record(segment.visit).topCandidate);
    const position = parseLatLng(record(candidate.placeLocation).latLng);
    if (!position) { warnInvalid(context, "coordinate"); return undefined; }
    const semanticType = stringValue(candidate.semanticType);
    const placeId = stringValue(candidate.placeId);
    return { kind: "visit", id: idFor("device-timeline", "visit", startMs, [position]), sourceFormat: "device-timeline", startMs, endMs, position, label: titleCase(semanticType) || placeId || "Unnamed visit", placeId } satisfies VisitEvent;
  }
  if (segment.activity) {
    const activity = record(segment.activity);
    const path = [parseLatLng(record(activity.start).latLng), parseLatLng(record(activity.end).latLng)].filter(Boolean) as Position[];
    if (!path.length) { warnInvalid(context, "coordinate"); return undefined; }
    return { kind: "movement", id: idFor("device-timeline", "movement", startMs, path), sourceFormat: "device-timeline", startMs, endMs, activityType: titleCase(stringValue(record(activity.topCandidate).type)), path, pathQuality: "endpoints" } satisfies MovementEvent;
  }
  if (segment.timelinePath) {
    const pathEntries = array(segment.timelinePath);
    const path = pathEntries.map((entry) => parseLatLng(record(entry).point)).filter(Boolean) as Position[];
    if (!path.length) { warnInvalid(context, "coordinate"); return undefined; }
    return { kind: "movement", id: idFor("device-timeline", "path", startMs, path), sourceFormat: "device-timeline", startMs, endMs: endMs ?? parseTimestamp(record(pathEntries.at(-1)).time), activityType: "Timeline path", path, pathQuality: "recorded" } satisfies MovementEvent;
  }
  return undefined;
};
