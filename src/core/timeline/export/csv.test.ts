import { describe, expect, it } from "vitest";
import type { TimelineEvent } from "../model/types";
import { eventsToCSV } from "./csv";

const events: TimelineEvent[] = [
  { kind: "visit", id: "visit", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 0, 1, 8), position: [106.82, -6.17], label: "Synthetic" },
  { kind: "movement", id: "move", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 0, 1, 9), activityType: "Walking", pathQuality: "recorded", path: [[106.82, -6.17], [106.83, -6.18]] },
];

describe("CSV export", () => {
  it("uses ISO-8601 UTC values and quotes activity labels", () => {
    const csv = eventsToCSV(events);
    expect(csv).toContain("2025-01-01T08:00:00.000Z");
    expect(csv).toContain('"Walking"');
  });
});
