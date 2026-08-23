import { describe, expect, it } from "vitest";
import type { TimelineEvent } from "@/core/timeline";
import { chooseRecordingMimeType } from "../media/mime-types";
import { buildJourneyTrack } from "./journey-track";
import { videoDimensions } from "./video-settings";

const events: TimelineEvent[] = [
  { kind: "visit", id: "visit-a", sourceFormat: "device-timeline", startMs: 100, endMs: 150, position: [106.8, -6.2], label: "Start" },
  { kind: "movement", id: "move-a", sourceFormat: "device-timeline", startMs: 200, endMs: 500, activityType: "Driving", pathQuality: "recorded", path: [[106.8, -6.2], [107.6, -6.9]] },
  { kind: "visit", id: "visit-b", sourceFormat: "device-timeline", startMs: 600, position: [107.6, -6.9], label: "Finish" },
  { kind: "sample", id: "raw-a", sourceFormat: "legacy-records", timestampMs: 300, position: [120, 1] },
];

describe("journey video model", () => {
  it("builds movement and visit steps without connecting raw samples", () => {
    const track = buildJourneyTrack(events);
    expect(track.movements).toHaveLength(1);
    expect(track.visits).toHaveLength(2);
    expect(track.steps.some((step) => step.id === "raw-a")).toBe(false);
    expect(track.totalDistanceKm).toBeGreaterThan(100);
  });

  it("returns deterministic frames along recorded geometry", () => {
    const track = buildJourneyTrack(events);
    const first = track.frameAt(0.5);
    expect(track.frameAt(0.5)).toEqual(first);
    expect(first.position).toBeDefined();
    expect(first.position?.[0]).toBeGreaterThanOrEqual(106.8);
    expect(first.position?.[0]).toBeLessThanOrEqual(107.6);
  });

  it("uses the short path across the international date line", () => {
    const track = buildJourneyTrack([{ kind: "movement", id: "date-line", sourceFormat: "device-timeline", startMs: 0, endMs: 10, activityType: "Flying", pathQuality: "endpoints", path: [[179, 10], [-179, 10]] }]);
    const longitude = track.frameAt(0.5).position?.[0];
    expect(Math.abs(longitude ?? 0)).toBeGreaterThan(179);
    expect((track.bounds?.east ?? 360) - (track.bounds?.west ?? 0)).toBeLessThan(5);
  });

  it("supports visit-only journeys without inventing paths", () => {
    const track = buildJourneyTrack(events.filter((event) => event.kind === "visit"));
    expect(track.movements).toHaveLength(0);
    expect(track.frameAt(0.75).activePath).toHaveLength(0);
    expect(track.frameAt(0.75).position).toBeDefined();
  });

  it("selects dimensions and MP4 with a WebM fallback", () => {
    expect(videoDimensions("portrait", "hd")).toEqual({ width: 1080, height: 1920 });
    expect(chooseRecordingMimeType((mime) => mime === "video/mp4").extension).toBe("mp4");
    expect(chooseRecordingMimeType((mime) => mime.includes("vp8")).extension).toBe("webm");
  });
});
