"use client";

import { useRef, useState } from "react";
import { Brand } from "@/shared/components/Brand";
import { REPOSITORY_URL } from "@/shared/config/environment";

interface LandingPageProps {
  onFiles: (files: File[]) => void;
  onDemo: () => void;
  busy: boolean;
  progress: string;
  error: string;
  onCancel: () => void;
  interactive: boolean;
}

export function LandingPage({ onFiles, onDemo, busy, progress, error, onCancel, interactive }: LandingPageProps) {
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
          <a className="github-link" href={REPOSITORY_URL} target="_blank" rel="noreferrer">View on GitHub <span aria-hidden="true">↗</span></a>
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
          <div className="drop-zone" onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFiles(event.dataTransfer.files); }}>
            {interactive && <input ref={inputRef} hidden type="file" multiple accept=".json,.zip,application/json,application/zip" onChange={(event) => acceptFiles(event.target.files)} />}
            <span className="upload-glyph" aria-hidden="true">↑</span>
            <h2>{busy ? "Reading your journey…" : "Drop your Timeline export"}</h2>
            <p>{busy ? progress : "or choose files from your device"}</p>
            {busy ? <button className="secondary-button" type="button" onClick={onCancel}>Cancel import</button> : <button type="button" disabled={!interactive} onClick={() => inputRef.current?.click()}>Choose files</button>}
            {!busy && <button className="text-button" type="button" disabled={!interactive} onClick={onDemo}>Explore synthetic demo</button>}
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <p className="import-note">Supports Timeline.json, Semantic Location History, Records.json, multiple monthly files, and Takeout ZIP archives.</p>
        </div>
      </section>
      <section className="process-section" id="how-it-works">
        <div className="section-intro"><span className="step-label">HOW IT WORKS</span><h2>From raw export to a readable journey.</h2></div>
        <div className="process-grid"><article><strong>01</strong><h3>Export</h3><p>On Android, open Settings → Location → Location services → Timeline → Export Timeline data.</p></article><article><strong>02</strong><h3>Import locally</h3><p>Select one JSON, multiple monthly files, or a ZIP archive. Parsing happens in a dedicated browser worker.</p></article><article><strong>03</strong><h3>Explore & export</h3><p>Filter routes and visits, inspect statistics, then download a private GeoJSON or CSV copy.</p></article></div>
      </section>
      <section className="privacy-section" id="privacy"><div><span className="step-label">PRIVACY BY DESIGN</span><h2>Your location history is nobody else&apos;s business.</h2></div><div className="privacy-copy"><p>Your Timeline file is read in browser memory and is never sent to this website, an API, or an analytics service.</p><p>The basemap loads tiles from the configured map provider, which can see the map area requested by your browser—but never receives the contents of your Timeline file.</p></div></section>
      <footer><Brand /><p>Open source under the MIT License. Not affiliated with or endorsed by Google.</p></footer>
    </main>
  );
}
