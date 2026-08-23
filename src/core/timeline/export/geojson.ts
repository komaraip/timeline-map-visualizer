import type { TimelineEvent } from "../model/types";

const propertiesFor = (event: TimelineEvent) => {
  if (event.kind === "visit") return {
    id: event.id, type: event.kind, startTime: new Date(event.startMs).toISOString(),
    endTime: event.endMs ? new Date(event.endMs).toISOString() : "", label: event.label,
    address: event.address || "", placeId: event.placeId || "", sourceFormat: event.sourceFormat,
  };
  if (event.kind === "movement") return {
    id: event.id, type: event.kind, startTime: new Date(event.startMs).toISOString(),
    endTime: event.endMs ? new Date(event.endMs).toISOString() : "", activityType: event.activityType,
    pathQuality: event.pathQuality, sourceFormat: event.sourceFormat,
  };
  return {
    id: event.id, type: event.kind, startTime: new Date(event.timestampMs).toISOString(),
    accuracy: event.accuracy ?? "", activityType: event.activityType || "", sourceFormat: event.sourceFormat,
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
