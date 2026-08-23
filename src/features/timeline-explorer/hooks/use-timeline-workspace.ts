"use client";

import { useMemo, useState } from "react";
import { eventTime, type ImportReport, type TimelineEvent } from "@/core/timeline";
import { useTimelineImport } from "@/features/timeline-import";
import { useTimelineFilters } from "./use-timeline-filters";

const syntheticEvents: TimelineEvent[] = [
  { kind: "visit", id: "demo-visit-1", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 3, 12, 8, 15), endMs: Date.UTC(2025, 3, 12, 9, 20), position: [-9.1427, 38.7369], label: "Morning market", address: "Synthetic sample location" },
  { kind: "movement", id: "demo-move-1", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 3, 12, 9, 20), endMs: Date.UTC(2025, 3, 12, 10, 5), activityType: "Walking", pathQuality: "recorded", path: [[-9.1427, 38.7369], [-9.147, 38.728], [-9.151, 38.716], [-9.1472, 38.7068]] },
  { kind: "visit", id: "demo-visit-2", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 3, 12, 10, 5), endMs: Date.UTC(2025, 3, 12, 12, 10), position: [-9.1472, 38.7068], label: "Riverside museum", address: "Synthetic sample location" },
  { kind: "movement", id: "demo-move-2", sourceFormat: "legacy-semantic", startMs: Date.UTC(2025, 3, 12, 12, 10), endMs: Date.UTC(2025, 3, 12, 12, 35), activityType: "Transit", pathQuality: "simplified", path: [[-9.1472, 38.7068], [-9.133, 38.713], [-9.12, 38.722], [-9.109, 38.737]] },
  { kind: "visit", id: "demo-visit-3", sourceFormat: "legacy-semantic", startMs: Date.UTC(2025, 3, 12, 12, 35), endMs: Date.UTC(2025, 3, 12, 15, 40), position: [-9.109, 38.737], label: "Garden lookout", address: "Synthetic sample location" },
  ...Array.from({ length: 32 }, (_, index): TimelineEvent => ({ kind: "sample", id: `demo-sample-${index}`, sourceFormat: "legacy-records", timestampMs: Date.UTC(2025, 3, 12, 9, 20 + index), position: [-9.1427 - index * 0.00015, 38.7369 - index * 0.0008], accuracy: 18 + (index % 5) * 4, activityType: "Walking" })),
];

const demoReport: ImportReport = {
  formats: ["device-timeline", "legacy-semantic", "legacy-records"],
  accepted: syntheticEvents.length,
  skipped: 0,
  duplicates: 0,
  ignoredFiles: 0,
  warnings: [],
};

export function useTimelineWorkspace() {
  const timelineImport = useTimelineImport();
  const filters = useTimelineFilters(timelineImport.events);
  const [selectedId, setSelectedId] = useState<string>();
  const [timeZone, setTimeZone] = useState("browser");
  const [customTimeZone, setCustomTimeZone] = useState("Asia/Jakarta");
  const [panelOpen, setPanelOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const effectiveTimeZone = timeZone === "custom" ? customTimeZone : timeZone === "utc" ? "UTC" : "browser";
  const selected = useMemo(
    () => filters.filteredEvents.find((event) => event.id === selectedId),
    [filters.filteredEvents, selectedId],
  );

  const loadDemo = () => timelineImport.loadEvents(syntheticEvents, demoReport);
  const clearData = () => {
    setStudioOpen(false);
    timelineImport.clearImport();
    filters.resetFilters();
    setSelectedId(undefined);
    setPanelOpen(false);
  };

  return {
    ...timelineImport,
    ...filters,
    selectedId,
    setSelectedId,
    selected,
    timeZone,
    setTimeZone,
    customTimeZone,
    setCustomTimeZone,
    effectiveTimeZone,
    panelOpen,
    setPanelOpen,
    studioOpen,
    setStudioOpen,
    loadDemo,
    clearData,
    eventTime,
  };
}
