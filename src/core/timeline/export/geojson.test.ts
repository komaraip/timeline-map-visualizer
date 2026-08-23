import { describe, expect, it } from "vitest";
import type { TimelineEvent } from "../model/types";
import { eventsToGeoJSON } from "./geojson";

const events: TimelineEvent[] = [
  { kind: "visit", id: "visit", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 0, 1, 8), position: [106.82, -6.17], label: "Synthetic" },
  { kind: "movement", id: "move", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 0, 1, 9), activityType: "Walking", pathQuality: "recorded", path: [[106.82, -6.17], [106.83, -6.18]] },
];

describe("GeoJSON export", () => {
  it("exports points and lines using GeoJSON coordinate order", () => {
    const geojson = eventsToGeoJSON(events);
    expect(geojson.features[0].geometry.type).toBe("Point");
    expect(geojson.features[1].geometry.type).toBe("LineString");
  });
});
