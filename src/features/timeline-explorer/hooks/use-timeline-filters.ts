import { useCallback, useMemo, useState } from "react";
import { eventTime, filterEvents, getStatistics, sampleRawEvents, type TimelineEvent } from "@/core/timeline";

type KindState = Record<TimelineEvent["kind"], boolean>;
const DEFAULT_KINDS: KindState = { visit: true, movement: true, sample: true };

export function useTimelineFilters(events: TimelineEvent[]) {
  const [selectedStartDate, setStartDate] = useState<string>();
  const [selectedEndDate, setEndDate] = useState<string>();
  const [kinds, setKinds] = useState<KindState>(DEFAULT_KINDS);
  const [activities, setActivities] = useState<Set<string>>(new Set());

  const startDate = selectedStartDate ?? (events[0] ? new Date(eventTime(events[0])).toISOString().slice(0, 10) : "");
  const endDate = selectedEndDate ?? (events.length ? new Date(eventTime(events.at(-1)!)).toISOString().slice(0, 10) : "");

  const activityOptions = useMemo(() => [
    ...new Set(events.filter((event) => event.kind === "movement").map((event) => event.activityType)),
  ].sort(), [events]);

  const filteredEvents = useMemo(() => filterEvents(events, {
    startDate,
    endDate,
    kinds: new Set(Object.entries(kinds).filter(([, enabled]) => enabled)
      .map(([kind]) => kind as TimelineEvent["kind"])),
    activities,
  }), [activities, endDate, events, kinds, startDate]);

  const sampled = useMemo(() => sampleRawEvents(filteredEvents), [filteredEvents]);
  const statistics = useMemo(() => getStatistics(filteredEvents), [filteredEvents]);
  const timelineEvents = useMemo(
    () => filteredEvents.filter((event) => event.kind !== "sample").toReversed().slice(0, 500),
    [filteredEvents],
  );

  const toggleActivity = useCallback((activity: string) => {
    setActivities((current) => {
      const next = new Set(current);
      if (next.has(activity)) next.delete(activity);
      else next.add(activity);
      return next;
    });
  }, []);

  const toggleKind = useCallback((kind: TimelineEvent["kind"]) => {
    setKinds((current) => ({ ...current, [kind]: !current[kind] }));
  }, []);

  const resetFilters = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    setKinds(DEFAULT_KINDS);
    setActivities(new Set());
  }, []);

  return {
    startDate, setStartDate, endDate, setEndDate, kinds, toggleKind,
    activities, setActivities, toggleActivity, activityOptions,
    filteredEvents, sampled, statistics, timelineEvents, resetFilters,
  };
}
