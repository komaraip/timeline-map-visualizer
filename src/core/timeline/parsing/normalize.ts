import type { Position, SourceFormat } from "../model/types";
import type { ParserContext } from "./types";

export type UnknownRecord = Record<string, unknown>;
export const record = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
export const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
export const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
export const numberValue = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
export const validPosition = ([longitude, latitude]: Position) =>
  longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;

export const parseTimestamp = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value < 10_000_000_000 ? value * 1000 : value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (/^\d+$/.test(value)) {
    const numeric = Number(value);
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseLatLng = (value: unknown): Position | undefined => {
  if (Array.isArray(value) && value.length >= 2) {
    const first = numberValue(value[0]);
    const second = numberValue(value[1]);
    if (first !== undefined && second !== undefined) {
      const position: Position = [first, second];
      return validPosition(position) ? position : undefined;
    }
  }
  if (typeof value !== "string") return undefined;
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return undefined;
  const position: Position = [Number(matches[1]), Number(matches[0])];
  return validPosition(position) ? position : undefined;
};

export const parseE7Position = (value: unknown): Position | undefined => {
  const candidate = record(value);
  const latitudeE7 = numberValue(candidate.latitudeE7);
  const longitudeE7 = numberValue(candidate.longitudeE7);
  const latitude = latitudeE7 !== undefined ? latitudeE7 / 1e7 : numberValue(candidate.latitude);
  const longitude = longitudeE7 !== undefined ? longitudeE7 / 1e7 : numberValue(candidate.longitude);
  if (latitude === undefined || longitude === undefined) return undefined;
  const position: Position = [longitude, latitude];
  return validPosition(position) ? position : undefined;
};

export const titleCase = (value?: string) => (value || "Unknown").toLowerCase().split(/[_\s]+/)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
};
export const idFor = (format: SourceFormat, kind: string, time: number, positions: Position[]) =>
  `${format}-${kind}-${stableHash(`${time}|${positions.map((point) => point.join(",")).join("|")}`)}`;
export const warnInvalid = (context: ParserContext, type: "timestamp" | "coordinate") => {
  context.warn(
    type === "timestamp" ? "INVALID_TIMESTAMP" : "INVALID_COORDINATE",
    type === "timestamp" ? "One or more entries had an invalid timestamp and were skipped." : "One or more entries had invalid coordinates and were skipped.",
  );
};
