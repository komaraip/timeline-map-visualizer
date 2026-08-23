"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { filterEvents, getStatistics, sampleRawEvents } from "../../lib/timeline/analytics";
import { downloadText, eventsToCSV, eventsToGeoJSON } from "../../lib/timeline/export";
import { eventTime, type ImportReport, type TimelineEvent } from "../../lib/timeline/types";
import { JourneyVideoStudio } from "./JourneyVideoStudio";
import { TimelineMap } from "./TimelineMap";

const repositoryUrl = import.meta.env.VITE_REPOSITORY_URL || "https://github.com";

const syntheticEvents: TimelineEvent[] = [
  { kind: "visit", id: "demo-visit-1", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 3, 12, 8, 15), endMs: Date.UTC(2025, 3, 12, 9, 20), position: [-9.1427, 38.7369], label: "Morning market", address: "Synthetic sample location" },
  { kind: "movement", id: "demo-move-1", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 3, 12, 9, 20), endMs: Date.UTC(2025, 3, 12, 10, 5), activityType: "Walking", pathQuality: "recorded", path: [[-9.1427, 38.7369], [-9.147, 38.728], [-9.151, 38.716], [-9.1472, 38.7068]] },
  { kind: "visit", id: "demo-visit-2", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 3, 12, 10, 5), endMs: Date.UTC(2025, 3, 12, 12, 10), position: [-9.1472, 38.7068], label: "Riverside museum", address: "Synthetic sample location" },
  { kind: "movement", id: "demo-move-2", sourceFormat: "legacy-semantic", startMs: Date.UTC(2025, 3, 12, 12, 10), endMs: Date.UTC(2025, 3, 12, 12, 35), activityType: "Transit", pathQuality: "simplified", path: [[-9.1472, 38.7068], [-9.133, 38.713], [-9.12, 38.722], [-9.109, 38.737]] },
  { kind: "visit", id: "demo-visit-3", sourceFormat: "legacy-semantic", startMs: Date.UTC(2025, 3, 12, 12, 35), endMs: Date.UTC(2025, 3, 12, 15, 40), position: [-9.109, 38.737], label: "Garden lookout", address: "Synthetic sample location" },
  ...Array.from({ length: 32 }, (_, index): TimelineEvent => ({ kind: "sample", id: `demo-sample-${index}`, sourceFormat: "legacy-records", timestampMs: Date.UTC(2025, 3, 12, 9, 20 + index), position: [-9.1427 - index * 0.00015, 38.7369 - index * 0.0008], accuracy: 18 + (index % 5) * 4, activityType: "Walking" })),
];

const formatDuration = (durationMs: number) => {
  const hours = Math.floor(durationMs / 3_600_000);
  const minutes = Math.round((durationMs % 3_600_000) / 60_000);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const safeFormat = (timestamp: number, timeZone: string, options: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat("en", { ...options, timeZone: timeZone === "browser" ? undefined : timeZone }).format(timestamp);
  } catch {
    return new Intl.DateTimeFormat("en", options).format(timestamp);
  }
};

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Timeline Map Visualizer home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>Timeline Map Visualizer</span>
    </a>
  );
}

function Landing({ onFiles, onDemo, busy, progress, error, onCancel }: {
  onFiles: (files: File[]) => void;
  onDemo: () => void;
  busy: boolean;
  progress: string;
  error: string;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const acceptFiles = (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (files.length) onFiles(files);
  };

  return (
    <main id="top">
      <header className="site-header">
        <Brand />
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          <a className="github-link" href={repositoryUrl} target="_blank" rel="noreferrer">View on GitHub <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Your data stays on your device</div>
          <h1>Your journeys,<br /><em>beautifully mapped.</em></h1>
          <p>Turn your Google Maps Timeline export into a clear, interactive story. No account. No upload. No tracking.</p>
          <div className="trust-row" aria-label="Privacy promises"><span>◆ Local processing</span><span>◆ Open source</span><span>◆ No sign-up</span></div>
        </div>

        <div className={`import-card ${dragging ? "is-dragging" : ""}`}>
          <div className="import-card-top"><span className="step-label">01 — IMPORT</span><span className="format-label">JSON · ZIP</span></div>
          <div
            className="drop-zone"
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFiles(event.dataTransfer.files); }}
          >
            <input ref={inputRef} hidden type="file" multiple accept=".json,.zip,application/json,application/zip" onChange={(event) => acceptFiles(event.target.files)} />
            <span className="upload-glyph" aria-hidden="true">↑</span>
            <h2>{busy ? "Reading your journey…" : "Drop your Timeline export"}</h2>
            <p>{busy ? progress : "or choose files from your device"}</p>
            {busy ? <button className="secondary-button" type="button" onClick={onCancel}>Cancel import</button> : <button type="button" onClick={() => inputRef.current?.click()}>Choose files</button>}
            {!busy && <button className="text-button" type="button" onClick={onDemo}>Explore synthetic demo</button>}
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <p className="import-note">Supports Timeline.json, Semantic Location History, Records.json, multiple monthly files, and Takeout ZIP archives.</p>
        </div>
      </section>

      <section className="process-section" id="how-it-works">
        <div className="section-intro"><span className="step-label">HOW IT WORKS</span><h2>From raw export to a readable journey.</h2></div>
        <div className="process-grid">
          <article><strong>01</strong><h3>Export</h3><p>On Android, open Settings → Location → Location services → Timeline → Export Timeline data.</p></article>
          <article><strong>02</strong><h3>Import locally</h3><p>Select one JSON, multiple monthly files, or a ZIP archive. Parsing happens in a dedicated browser worker.</p></article>
          <article><strong>03</strong><h3>Explore & export</h3><p>Filter routes and visits, inspect statistics, then download a private GeoJSON or CSV copy.</p></article>
        </div>
      </section>

      <section className="privacy-section" id="privacy">
        <div><span className="step-label">PRIVACY BY DESIGN</span><h2>Your location history is nobody else&apos;s business.</h2></div>
        <div className="privacy-copy"><p>Your Timeline file is read in browser memory and is never sent to this website, an API, or an analytics service.</p><p>The basemap loads tiles from the configured map provider, which can see the map area requested by your browser—but never receives the contents of your Timeline file.</p></div>
      </section>
      <footer><Brand /><p>Open source under the MIT License. Not affiliated with or endorsed by Google.</p></footer>
    </main>
  );
}

export function TimelineApp() {
  const workerRef = useRef<Worker | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("Preparing your files…");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [kinds, setKinds] = useState({ visit: true, movement: true, sample: true });
  const [activities, setActivities] = useState<Set<string>>(new Set());
  const [timeZone, setTimeZone] = useState("browser");
  const [customTimeZone, setCustomTimeZone] = useState("Asia/Jakarta");
  const [panelOpen, setPanelOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const initializeDates = (nextEvents: TimelineEvent[]) => {
    if (!nextEvents.length) return;
    setStartDate(new Date(eventTime(nextEvents[0])).toISOString().slice(0, 10));
    setEndDate(new Date(eventTime(nextEvents.at(-1)!)).toISOString().slice(0, 10));
  };

  const importFiles = (files: File[]) => {
    workerRef.current?.terminate();
    const worker = new Worker(new URL("../../workers/import-worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    setBusy(true); setError(""); setProgress("Opening files safely…");
    worker.onmessage = (message: MessageEvent<{ type: string; events?: TimelineEvent[]; report?: ImportReport; accepted?: number; fileName?: string; message?: string }>) => {
      if (message.data.type === "progress") setProgress(`${message.data.accepted?.toLocaleString() || 0} events · ${message.data.fileName || "processing"}`);
      if (message.data.type === "complete") {
        const nextEvents = message.data.events || [];
        setEvents(nextEvents); setReport(message.data.report || null); initializeDates(nextEvents); setBusy(false);
        if (!nextEvents.length) setError("No supported Timeline events were found in those files.");
      }
      if (message.data.type === "error") { setError(message.data.message || "Import failed."); setReport(message.data.report || null); setBusy(false); }
      if (message.data.type === "cancelled") setBusy(false);
    };
    worker.onerror = () => { setError("The importer stopped unexpectedly. Your files were not uploaded."); setBusy(false); };
    worker.postMessage({ type: "import", files });
  };

  const loadDemo = () => {
    setEvents(syntheticEvents); initializeDates(syntheticEvents);
    setReport({ formats: ["device-timeline", "legacy-semantic", "legacy-records"], accepted: syntheticEvents.length, skipped: 0, duplicates: 0, ignoredFiles: 0, warnings: [] });
  };

  const cancelImport = () => workerRef.current?.postMessage({ type: "cancel" });
  const clearData = () => {
    setStudioOpen(false); workerRef.current?.terminate(); workerRef.current = null; setEvents([]); setReport(null); setSelectedId(undefined); setBusy(false); setError(""); setActivities(new Set());
  };

  const activityOptions = useMemo(() => [...new Set(events.filter((event) => event.kind === "movement").map((event) => event.activityType))].sort(), [events]);
  const effectiveTimeZone = timeZone === "custom" ? customTimeZone : timeZone === "utc" ? "UTC" : "browser";
  const filteredEvents = useMemo(() => filterEvents(events, {
    startDate,
    endDate,
    kinds: new Set(Object.entries(kinds).filter(([, enabled]) => enabled).map(([kind]) => kind as TimelineEvent["kind"])),
    activities,
  }), [events, startDate, endDate, kinds, activities]);
  const sampled = useMemo(() => sampleRawEvents(filteredEvents), [filteredEvents]);
  const statistics = useMemo(() => getStatistics(filteredEvents), [filteredEvents]);
  const selected = filteredEvents.find((event) => event.id === selectedId);
  const timelineEvents = filteredEvents.filter((event) => event.kind !== "sample").toReversed().slice(0, 500);

  const toggleActivity = (activity: string) => setActivities((current) => {
    const next = new Set(current);
    if (next.has(activity)) next.delete(activity); else next.add(activity);
    return next;
  });

  const exportGeoJSON = () => downloadText(JSON.stringify(eventsToGeoJSON(filteredEvents), null, 2), "filtered-timeline.geojson", "application/geo+json");
  const exportCSV = () => downloadText(eventsToCSV(filteredEvents), "filtered-timeline.csv", "text/csv;charset=utf-8");

  if (!events.length) return <Landing onFiles={importFiles} onDemo={loadDemo} busy={busy} progress={progress} error={error} onCancel={cancelImport} />;

  return (
    <main className="app-shell" id="top">
      <header className="app-header">
        <Brand />
        <div className="dataset-status"><span /> {filteredEvents.length.toLocaleString()} of {events.length.toLocaleString()} events</div>
        <div className="app-actions"><button type="button" className="icon-button mobile-filter" onClick={() => setPanelOpen(true)}>Filters</button><button type="button" className="create-short-button" disabled={!filteredEvents.length} onClick={() => setStudioOpen(true)}>Create short</button><button type="button" className="ghost-button" onClick={clearData}>Clear data</button></div>
      </header>

      <div className="workspace">
        <aside className={`control-panel ${panelOpen ? "open" : ""}`}>
          <div className="panel-mobile-head"><strong>Filters & timeline</strong><button type="button" onClick={() => setPanelOpen(false)} aria-label="Close panel">×</button></div>
          <section className="control-section"><div className="section-label"><span>01</span> Date range</div><div className="date-grid"><label>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div></section>
          <section className="control-section"><div className="section-label"><span>02</span> Map layers</div><div className="toggle-list">{(["visit", "movement", "sample"] as const).map((kind) => <label key={kind}><span className={`legend-dot ${kind}`} />{kind === "sample" ? "Raw samples" : `${kind[0].toUpperCase()}${kind.slice(1)}s`}<input type="checkbox" checked={kinds[kind]} onChange={() => setKinds((value) => ({ ...value, [kind]: !value[kind] }))} /><i /></label>)}</div></section>
          {activityOptions.length > 0 && <section className="control-section"><div className="section-label"><span>03</span> Activities</div><div className="chip-list"><button type="button" className={!activities.size ? "active" : ""} onClick={() => setActivities(new Set())}>All</button>{activityOptions.map((activity) => <button type="button" className={activities.has(activity) ? "active" : ""} key={activity} onClick={() => toggleActivity(activity)}>{activity}</button>)}</div></section>}
          <section className="control-section"><div className="section-label"><span>04</span> Time zone</div><select value={timeZone} onChange={(event) => setTimeZone(event.target.value)} aria-label="Display time zone"><option value="browser">Browser local</option><option value="utc">UTC</option><option value="custom">Custom IANA zone</option></select>{timeZone === "custom" && <input className="timezone-input" aria-label="Custom IANA time zone" value={customTimeZone} onChange={(event) => setCustomTimeZone(event.target.value)} placeholder="Europe/Lisbon" />}</section>

          <section className="timeline-section">
            <div className="timeline-head"><div className="section-label"><span>05</span> Timeline</div><small>{timelineEvents.length} entries</small></div>
            <div className="timeline-list">
              {timelineEvents.map((event, index) => {
                const previous = timelineEvents[index - 1];
                const day = safeFormat(eventTime(event), effectiveTimeZone, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
                const previousDay = previous ? safeFormat(eventTime(previous), effectiveTimeZone, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
                return <div key={event.id}>{day !== previousDay && <h4>{day}</h4>}<button type="button" className={selectedId === event.id ? "selected" : ""} onClick={() => { setSelectedId(event.id); setPanelOpen(false); }}><span className={`event-icon ${event.kind}`}>{event.kind === "visit" ? "●" : "→"}</span><span><strong>{event.kind === "visit" ? event.label : event.activityType}</strong><small>{safeFormat(eventTime(event), effectiveTimeZone, { hour: "2-digit", minute: "2-digit" })}{event.kind === "movement" ? ` · ${event.pathQuality} path` : ""}</small></span></button></div>;
              })}
              {!timelineEvents.length && <p className="empty-message">No visits or movements match these filters.</p>}
            </div>
          </section>
        </aside>

        <section className="map-workspace">
          <TimelineMap events={sampled.events} selectedId={selectedId} onSelect={setSelectedId} />
          <div className="stats-bar"><article><small>VISITS</small><strong>{statistics.visits.toLocaleString()}</strong></article><article><small>ACTIVE DAYS</small><strong>{statistics.activeDays.toLocaleString()}</strong></article><article><small>MAPPED DISTANCE</small><strong>{statistics.mappedDistanceKm.toFixed(statistics.mappedDistanceKm < 100 ? 1 : 0)} <em>km</em></strong></article><article><small>RECORDED TIME</small><strong>{formatDuration(statistics.durationMs)}</strong></article></div>
          {sampled.sampled && <div className="sampling-note">Showing a deterministic sample of {sampled.shown.toLocaleString()} from {sampled.total.toLocaleString()} raw points. Narrow the date range for more detail.</div>}
          {selected && <div className="detail-card"><button type="button" onClick={() => setSelectedId(undefined)} aria-label="Close event details">×</button><small>{selected.kind.toUpperCase()} · {selected.sourceFormat}</small><h2>{selected.kind === "visit" ? selected.label : selected.kind === "movement" ? selected.activityType : "Raw location sample"}</h2><p>{safeFormat(eventTime(selected), effectiveTimeZone, { dateStyle: "full", timeStyle: "short" })}</p>{selected.kind === "visit" && selected.address && <p>{selected.address}</p>}{selected.kind === "movement" && <p>{selected.path.length} mapped points · {selected.pathQuality} geometry</p>}</div>}
          <div className="export-dock"><div><strong>Turn this filtered journey into a short</strong><small>Animate the mapped route with local music, or export the underlying data.</small></div><button type="button" className="short-dock-button" onClick={() => setStudioOpen(true)} disabled={!filteredEvents.length}>Create short</button><button type="button" onClick={exportGeoJSON}>GeoJSON</button><button type="button" onClick={exportCSV}>CSV</button></div>
        </section>
      </div>
      {panelOpen && <button className="panel-backdrop" type="button" aria-label="Close filters" onClick={() => setPanelOpen(false)} />}
      {studioOpen && <JourneyVideoStudio events={filteredEvents} onClose={() => setStudioOpen(false)} />}
      {report && <div className="sr-only" aria-live="polite">Imported {report.accepted} events, skipped {report.skipped}, removed {report.duplicates} duplicates.</div>}
    </main>
  );
}
