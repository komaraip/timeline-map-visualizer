import type { TimelineEvent } from "./types";

const propertiesFor = (event: TimelineEvent) => {
  if (event.kind === "visit") return {
    id: event.id,
    type: event.kind,
    startTime: new Date(event.startMs).toISOString(),
    endTime: event.endMs ? new Date(event.endMs).toISOString() : "",
    label: event.label,
    address: event.address || "",
    placeId: event.placeId || "",
    sourceFormat: event.sourceFormat,
  };
  if (event.kind === "movement") return {
    id: event.id,
    type: event.kind,
    startTime: new Date(event.startMs).toISOString(),
    endTime: event.endMs ? new Date(event.endMs).toISOString() : "",
    activityType: event.activityType,
    pathQuality: event.pathQuality,
    sourceFormat: event.sourceFormat,
  };
  return {
    id: event.id,
    type: event.kind,
    startTime: new Date(event.timestampMs).toISOString(),
    accuracy: event.accuracy ?? "",
    activityType: event.activityType || "",
    sourceFormat: event.sourceFormat,
  };
};

export const eventsToGeoJSON = (events: TimelineEvent[]) => ({
  type: "FeatureCollection" as const,
  features: events.map((event) => ({
    type: "Feature" as const,
    id: event.id,
    properties: propertiesFor(event),
    geometry: event.kind === "movement"
      ? { type: "LineString" as const, coordinates: event.path }
      : { type: "Point" as const, coordinates: event.position },
  })),
});

const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export const eventsToCSV = (events: TimelineEvent[]) => {
  const headers = ["id", "type", "source_format", "start_time", "end_time", "activity", "label", "longitude", "latitude", "end_longitude", "end_latitude", "accuracy", "path_quality"];
  const rows = events.map((event) => {
    const startTime = event.kind === "sample" ? event.timestampMs : event.startMs;
    const start = event.kind === "movement" ? event.path[0] : event.position;
    const end = event.kind === "movement" ? event.path.at(-1) : undefined;
    return [
      event.id,
      event.kind,
      event.sourceFormat,
      new Date(startTime).toISOString(),
      event.kind !== "sample" && event.endMs ? new Date(event.endMs).toISOString() : "",
      event.kind === "movement" ? event.activityType : event.kind === "sample" ? event.activityType || "" : "",
      event.kind === "visit" ? event.label : "",
      start?.[0] ?? "",
      start?.[1] ?? "",
      end?.[0] ?? "",
      end?.[1] ?? "",
      event.kind === "sample" ? event.accuracy ?? "" : "",
      event.kind === "movement" ? event.pathQuality : "",
    ].map(quote).join(",");
  });
  return [headers.join(","), ...rows].join("\n");
};

export const downloadText = (content: string, filename: string, mimeType: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
