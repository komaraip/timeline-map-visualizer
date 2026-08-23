import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLatLng } from "./normalize";
import { normalizeRoot } from "./registry";

const fixture = (name: string) => JSON.parse(readFileSync(resolve(process.cwd(), "tests", "fixtures", name), "utf8"));
const context = () => {
  const warnings: string[] = [];
  return { warnings, value: { sourceName: "fixture.json", warn: (code: string) => warnings.push(code) } };
};

describe("Timeline parsers", () => {
  it("normalizes device Timeline semantic segments", () => {
    const ctx = context();
    const result = normalizeRoot(fixture("device-timeline.json"), ctx.value as never);
    expect(result.format).toBe("device-timeline");
    expect(result.events).toHaveLength(3);
    expect(result.events[0]).toMatchObject({ kind: "visit", position: [106.8272, -6.1754] });
    expect(result.events[1]).toMatchObject({ kind: "movement", activityType: "Walking", pathQuality: "endpoints" });
  });

  it("normalizes legacy semantic visits and movements", () => {
    const ctx = context();
    const result = normalizeRoot(fixture("legacy-semantic.json"), ctx.value as never);
    expect(result.format).toBe("legacy-semantic");
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({ kind: "visit", label: "Synthetic square" });
    expect(result.events[1]).toMatchObject({ kind: "movement", activityType: "In Passenger Vehicle" });
  });

  it("normalizes Records.json and safely skips invalid entries", () => {
    const ctx = context();
    const result = normalizeRoot(fixture("records.json"), ctx.value as never);
    expect(result.format).toBe("legacy-records");
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ kind: "sample", accuracy: 18, activityType: "Walking" });
    expect(ctx.warnings).toContain("INVALID_TIMESTAMP");
  });

  it("rejects malformed coordinates without leaking values", () => {
    expect(parseLatLng("private coordinate text")).toBeUndefined();
    expect(parseLatLng("geo:95,220")).toBeUndefined();
  });

  it("returns no format for unsupported JSON", () => {
    const result = normalizeRoot({ somethingElse: [] }, context().value as never);
    expect(result).toEqual({ events: [] });
  });
});
