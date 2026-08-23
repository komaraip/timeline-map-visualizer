import type { TimelineEvent } from "@/core/timeline";

interface TimelineFiltersProps {
  startDate: string;
  endDate: string;
  onStartDate: (value: string) => void;
  onEndDate: (value: string) => void;
  kinds: Record<TimelineEvent["kind"], boolean>;
  onToggleKind: (kind: TimelineEvent["kind"]) => void;
  activityOptions: string[];
  activities: Set<string>;
  onActivity: (activity: string) => void;
  onAllActivities: () => void;
  timeZone: string;
  customTimeZone: string;
  onTimeZone: (value: string) => void;
  onCustomTimeZone: (value: string) => void;
}

export function TimelineFilters(props: TimelineFiltersProps) {
  return (
    <>
      <section className="control-section"><div className="section-label"><span>01</span> Date range</div><div className="date-grid"><label>From<input type="date" value={props.startDate} onChange={(event) => props.onStartDate(event.target.value)} /></label><label>To<input type="date" value={props.endDate} onChange={(event) => props.onEndDate(event.target.value)} /></label></div></section>
      <section className="control-section"><div className="section-label"><span>02</span> Map layers</div><div className="toggle-list">{(["visit", "movement", "sample"] as const).map((kind) => <label key={kind}><span className={`legend-dot ${kind}`} />{kind === "sample" ? "Raw samples" : `${kind[0].toUpperCase()}${kind.slice(1)}s`}<input type="checkbox" checked={props.kinds[kind]} onChange={() => props.onToggleKind(kind)} /><i /></label>)}</div></section>
      {props.activityOptions.length > 0 && <section className="control-section"><div className="section-label"><span>03</span> Activities</div><div className="chip-list"><button type="button" className={!props.activities.size ? "active" : ""} onClick={props.onAllActivities}>All</button>{props.activityOptions.map((activity) => <button type="button" className={props.activities.has(activity) ? "active" : ""} key={activity} onClick={() => props.onActivity(activity)}>{activity}</button>)}</div></section>}
      <section className="control-section"><div className="section-label"><span>04</span> Time zone</div><select value={props.timeZone} onChange={(event) => props.onTimeZone(event.target.value)} aria-label="Display time zone"><option value="browser">Browser local</option><option value="utc">UTC</option><option value="custom">Custom IANA zone</option></select>{props.timeZone === "custom" && <input className="timezone-input" aria-label="Custom IANA time zone" value={props.customTimeZone} onChange={(event) => props.onCustomTimeZone(event.target.value)} placeholder="Europe/Lisbon" />}</section>
    </>
  );
}
