import type { SampleEvent, TimelineEvent } from "../../model/types";
import { array, idFor, numberValue, parseE7Position, parseLatLng, parseTimestamp, record, stringValue, titleCase, warnInvalid } from "../normalize";
import type { ParserContext } from "../types";

export const parseRawLocation = (input: unknown, context: ParserContext): TimelineEvent | undefined => {
  const location = record(input);
  const timestampMs = parseTimestamp(location.timestamp ?? location.timestampMs);
  const position = parseE7Position(location) ?? parseLatLng(record(location.location).latLng);
  if (timestampMs === undefined || !position) { warnInvalid(context, timestampMs === undefined ? "timestamp" : "coordinate"); return undefined; }
  const activityBlock = record(array(location.activity)[0]);
  const activityType = stringValue(record(array(activityBlock.activity)[0]).type);
  return { kind: "sample", id: idFor("legacy-records", "sample", timestampMs, [position]), sourceFormat: "legacy-records", timestampMs, position, accuracy: numberValue(location.accuracy), activityType: activityType ? titleCase(activityType) : undefined } satisfies SampleEvent;
};
