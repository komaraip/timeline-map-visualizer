import type { TimelineEvent } from "../model/types";

const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export const eventsToCSV = (events: TimelineEvent[]) => {
  const headers = ["id", "type", "source_format", "start_time", "end_time", "activity", "label", "longitude", "latitude", "end_longitude", "end_latitude", "accuracy", "path_quality"];
  const rows = events.map((event) => {
    const startTime = event.kind === "sample" ? event.timestampMs : event.startMs;
    const start = event.kind === "movement" ? event.path[0] : event.position;
    const end = event.kind === "movement" ? event.path.at(-1) : undefined;
    return [
      event.id, event.kind, event.sourceFormat, new Date(startTime).toISOString(),
      event.kind !== "sample" && event.endMs ? new Date(event.endMs).toISOString() : "",
      event.kind === "movement" ? event.activityType : event.kind === "sample" ? event.activityType || "" : "",
      event.kind === "visit" ? event.label : "", start?.[0] ?? "", start?.[1] ?? "",
      end?.[0] ?? "", end?.[1] ?? "", event.kind === "sample" ? event.accuracy ?? "" : "",
      event.kind === "movement" ? event.pathQuality : "",
    ].map(quote).join(",");
  });
  return [headers.join(","), ...rows].join("\n");
};
