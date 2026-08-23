import { describe, expect, it } from "vitest";
import { filterEvents, getStatistics, sampleRawEvents } from "../lib/timeline/analytics";
import { eventsToCSV, eventsToGeoJSON } from "../lib/timeline/export";
import type { TimelineEvent } from "../lib/timeline/types";

const events: TimelineEvent[] = [
  { kind: "visit", id: "visit", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 0, 1, 8), endMs: Date.UTC(2025, 0, 1, 9), position: [106.82, -6.17], label: "Synthetic" },
  { kind: "movement", id: "move", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 0, 1, 9), endMs: Date.UTC(2025, 0, 1, 10), activityType: "Walking", pathQuality: "recorded", path: [[106.82, -6.17], [106.83, -6.18]] },
  ...Array.from({ length: 12 }, (_, index): TimelineEvent => ({ kind: "sample", id: `sample-${index}`, sourceFormat: "legacy-records", timestampMs: Date.UTC(2025, 0, 1, 10, index), position: [106.83, -6.18] })),
];

describe("Timeline analytics and exports", () => {
  it("filters by date, kind, and activity", () => {
    const result = filterEvents(events, { startDate: "2025-01-01", endDate: "2025-01-01", kinds: new Set(["movement"]), activities: new Set(["Walking"]) });
    expect(result.map((event) => event.id)).toEqual(["move"]);
  });

  it("computes mapped statistics", () => {
    const stats = getStatistics(events);
    expect(stats.visits).toBe(1);
    expect(stats.activeDays).toBe(1);
    expect(stats.mappedDistanceKm).toBeGreaterThan(1);
    expect(stats.durationMs).toBe(7_200_000);
  });

  it("samples raw points deterministically without dropping semantic events", () => {
    const result = sampleRawEvents(events, 5);
    expect(result.sampled).toBe(true);
    expect(result.events.filter((event) => event.kind === "sample")).toHaveLength(5);
    expect(result.events.some((event) => event.id === "visit")).toBe(true);
  });

  it("exports valid GeoJSON and UTC CSV fields", () => {
    const geojson = eventsToGeoJSON(events.slice(0, 2));
    expect(geojson.features[0].geometry.type).toBe("Point");
    expect(geojson.features[1].geometry.type).toBe("LineString");
    const csv = eventsToCSV(events.slice(0, 2));
    expect(csv).toContain("2025-01-01T08:00:00.000Z");
    expect(csv).toContain('"Walking"');
  });
});
