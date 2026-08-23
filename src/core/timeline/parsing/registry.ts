import type { SourceFormat, TimelineEvent } from "../model/types";
import { parseDeviceSegment } from "./adapters/device-timeline";
import { parseLegacyTimelineObject } from "./adapters/legacy-semantic";
import { parseRawLocation } from "./adapters/legacy-records";
import { array, record } from "./normalize";
import type { ParserContext } from "./types";

const ROOT_KEYS = ["semanticSegments", "timelineObjects", "locations"] as const;

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
  const rootKey = ROOT_KEYS.find((key) => Array.isArray(input[key]));
  if (!rootKey) return { events: [] };
  const format = detectSourceFormat(rootKey);
  if (!format) return { events: [] };
  const parse = parserForFormat(format);
  return {
    format,
    events: array(input[rootKey]).map((entry) => parse(entry, context)).filter(Boolean) as TimelineEvent[],
  };
};
