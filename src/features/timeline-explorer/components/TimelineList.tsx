import { eventTime, type TimelineEvent } from "@/core/timeline";
import { formatDate } from "@/shared/format/date";

interface TimelineListProps {
  events: TimelineEvent[];
  selectedId?: string;
  timeZone: string;
  onSelect: (id: string) => void;
}

export function TimelineList({ events, selectedId, timeZone, onSelect }: TimelineListProps) {
  return (
    <section className="timeline-section">
      <div className="timeline-head"><div className="section-label"><span>05</span> Timeline</div><small>{events.length} entries</small></div>
      <div className="timeline-list">
        {events.map((event, index) => {
          const previous = events[index - 1];
          const day = formatDate(eventTime(event), timeZone, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
          const previousDay = previous ? formatDate(eventTime(previous), timeZone, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
          return <div key={event.id}>{day !== previousDay && <h4>{day}</h4>}<button type="button" className={selectedId === event.id ? "selected" : ""} onClick={() => onSelect(event.id)}><span className={`event-icon ${event.kind}`}>{event.kind === "visit" ? "●" : "→"}</span><span><strong>{event.kind === "visit" ? event.label : event.kind === "movement" ? event.activityType : "Raw location sample"}</strong><small>{formatDate(eventTime(event), timeZone, { hour: "2-digit", minute: "2-digit" })}{event.kind === "movement" ? ` · ${event.pathQuality} path` : ""}</small></span></button></div>;
        })}
        {!events.length && <p className="empty-message">No visits or movements match these filters.</p>}
      </div>
    </section>
  );
}
