import { downloadText, eventTime, eventsToCSV, eventsToGeoJSON, type TimelineEvent } from "@/core/timeline";
import { JourneyVideoStudio } from "@/features/journey-video";
import { Brand } from "@/shared/components/Brand";
import { formatDate } from "@/shared/format/date";
import { useTimelineWorkspace } from "../hooks/use-timeline-workspace";
import { ExportDock } from "./ExportDock";
import { TimelineFilters } from "./TimelineFilters";
import { TimelineList } from "./TimelineList";
import { TimelineMap } from "./TimelineMap";
import { TimelineStats } from "./TimelineStats";

export function TimelineWorkspace({ workspace }: { workspace: ReturnType<typeof useTimelineWorkspace> }) {
  const exportGeoJSON = () => downloadText(JSON.stringify(eventsToGeoJSON(workspace.filteredEvents), null, 2), "filtered-timeline.geojson", "application/geo+json");
  const exportCSV = () => downloadText(eventsToCSV(workspace.filteredEvents), "filtered-timeline.csv", "text/csv;charset=utf-8");
  const selectFromPanel = (id: string) => { workspace.setSelectedId(id); workspace.setPanelOpen(false); };

  return (
    <main className="app-shell" id="top">
      <header className="app-header">
        <Brand />
        <div className="dataset-status"><span /> {workspace.filteredEvents.length.toLocaleString()} of {workspace.events.length.toLocaleString()} events</div>
        <div className="app-actions"><button type="button" className="icon-button mobile-filter" onClick={() => workspace.setPanelOpen(true)}>Filters</button><button type="button" className="create-short-button" disabled={!workspace.filteredEvents.length} onClick={() => workspace.setStudioOpen(true)}>Create short</button><button type="button" className="ghost-button" onClick={workspace.clearData}>Clear data</button></div>
      </header>
      <div className="workspace">
        <aside className={`control-panel ${workspace.panelOpen ? "open" : ""}`}>
          <div className="panel-mobile-head"><strong>Filters & timeline</strong><button type="button" onClick={() => workspace.setPanelOpen(false)} aria-label="Close panel">×</button></div>
          <TimelineFilters startDate={workspace.startDate} endDate={workspace.endDate} onStartDate={workspace.setStartDate} onEndDate={workspace.setEndDate} kinds={workspace.kinds} onToggleKind={workspace.toggleKind} activityOptions={workspace.activityOptions} activities={workspace.activities} onActivity={workspace.toggleActivity} onAllActivities={() => workspace.setActivities(new Set())} timeZone={workspace.timeZone} customTimeZone={workspace.customTimeZone} onTimeZone={workspace.setTimeZone} onCustomTimeZone={workspace.setCustomTimeZone} />
          <TimelineList events={workspace.timelineEvents} selectedId={workspace.selectedId} timeZone={workspace.effectiveTimeZone} onSelect={selectFromPanel} />
        </aside>
        <section className="map-workspace">
          <TimelineMap events={workspace.sampled.events} selectedId={workspace.selectedId} onSelect={workspace.setSelectedId} />
          <TimelineStats statistics={workspace.statistics} />
          {workspace.sampled.sampled && <div className="sampling-note">Showing a deterministic sample of {workspace.sampled.shown.toLocaleString()} from {workspace.sampled.total.toLocaleString()} raw points. Narrow the date range for more detail.</div>}
          {workspace.selected && <EventDetail event={workspace.selected} timeZone={workspace.effectiveTimeZone} onClose={() => workspace.setSelectedId(undefined)} />}
          <ExportDock disabled={!workspace.filteredEvents.length} onCreateShort={() => workspace.setStudioOpen(true)} onGeoJSON={exportGeoJSON} onCSV={exportCSV} />
        </section>
      </div>
      {workspace.panelOpen && <button className="panel-backdrop" type="button" aria-label="Close filters" onClick={() => workspace.setPanelOpen(false)} />}
      {workspace.studioOpen && <JourneyVideoStudio events={workspace.filteredEvents} onClose={() => workspace.setStudioOpen(false)} />}
      {workspace.report && <div className="sr-only" aria-live="polite">Imported {workspace.report.accepted} events, skipped {workspace.report.skipped}, removed {workspace.report.duplicates} duplicates.</div>}
    </main>
  );
}

function EventDetail({ event, timeZone, onClose }: { event: TimelineEvent; timeZone: string; onClose: () => void }) {
  return <div className="detail-card"><button type="button" onClick={onClose} aria-label="Close event details">×</button><small>{event.kind.toUpperCase()} · {event.sourceFormat}</small><h2>{event.kind === "visit" ? event.label : event.kind === "movement" ? event.activityType : "Raw location sample"}</h2><p>{formatDate(eventTime(event), timeZone, { dateStyle: "full", timeStyle: "short" })}</p>{event.kind === "visit" && event.address && <p>{event.address}</p>}{event.kind === "movement" && <p>{event.path.length} mapped points · {event.pathQuality} geometry</p>}</div>;
}
