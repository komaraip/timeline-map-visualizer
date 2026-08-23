import type { Position, TimelineEvent } from "./types";
import { eventTime } from "./types";

export interface TimelineFilters {
  startDate: string;
  endDate: string;
  kinds: Set<TimelineEvent["kind"]>;
  activities: Set<string>;
}

export const filterEvents = (events: TimelineEvent[], filters: TimelineFilters) => {
  const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`).getTime() : -Infinity;
  const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999`).getTime() : Infinity;
  return events.filter((event) => {
    const time = eventTime(event);
    if (time < start || time > end || !filters.kinds.has(event.kind)) return false;
    return event.kind !== "movement" || !filters.activities.size || filters.activities.has(event.activityType);
  });
};

const toRadians = (value: number) => (value * Math.PI) / 180;

export const distanceKm = (a: Position, b: Position) => {
  const [lon1, lat1] = a.map(toRadians);
  const [lon2, lat2] = b.map(toRadians);
  const latitudeDelta = lat2 - lat1;
  const longitudeDelta = lon2 - lon1;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const pathDistanceKm = (path: Position[]) =>
  path.slice(1).reduce((total, point, index) => total + distanceKm(path[index], point), 0);

export const getStatistics = (events: TimelineEvent[]) => {
  const visits = events.filter((event) => event.kind === "visit");
  const movements = events.filter((event) => event.kind === "movement");
  const activeDays = new Set(events.map((event) => new Date(eventTime(event)).toISOString().slice(0, 10))).size;
  const mappedDistanceKm = movements.reduce((sum, event) => sum + pathDistanceKm(event.path), 0);
  const durationMs = events.reduce((sum, event) => {
    if (event.kind === "sample" || !event.endMs) return sum;
    return sum + Math.max(0, event.endMs - event.startMs);
  }, 0);
  const activityCounts = movements.reduce<Record<string, number>>((counts, event) => {
    counts[event.activityType] = (counts[event.activityType] || 0) + 1;
    return counts;
  }, {});
  const placeCounts = visits.reduce<Record<string, number>>((counts, event) => {
    counts[event.label] = (counts[event.label] || 0) + 1;
    return counts;
  }, {});
  const topPlace = Object.entries(placeCounts).sort((a, b) => b[1] - a[1])[0];
  return { visits: visits.length, movements: movements.length, activeDays, mappedDistanceKm, durationMs, activityCounts, topPlace };
};

export const sampleRawEvents = (events: TimelineEvent[], limit = 100_000) => {
  const samples = events.filter((event) => event.kind === "sample");
  if (samples.length <= limit) return { events, sampled: false, shown: samples.length, total: samples.length };
  const step = samples.length / limit;
  const selected = new Set(Array.from({ length: limit }, (_, index) => samples[Math.floor(index * step)].id));
  return {
    events: events.filter((event) => event.kind !== "sample" || selected.has(event.id)),
    sampled: true,
    shown: limit,
    total: samples.length,
  };
};
