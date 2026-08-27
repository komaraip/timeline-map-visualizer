import { useRef, useState } from "react";
import { REPOSITORY_URL } from "@/shared/config/environment";

interface LandingPageProps {
  onFiles: (files: File[]) => void;
  onDemo: () => void;
  busy: boolean;
  progress: string;
  error: string;
  onCancel: () => void;
}

export function LandingPage({ onFiles, onDemo, busy, progress, error, onCancel }: LandingPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const acceptFiles = (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (files.length) onFiles(files);
  };

  return (
    <main className="landing-shell" id="top">
      <div className="landing-map-motion" aria-hidden="true">
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="landing-map-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" />
            </pattern>
            <radialGradient id="landing-map-wash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a9e6cd" stopOpacity=".54" />
              <stop offset="100%" stopColor="#a9e6cd" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="landing-map-water" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b9dfdc" stopOpacity=".56" />
              <stop offset="100%" stopColor="#d8eee8" stopOpacity=".22" />
            </linearGradient>
          </defs>

          <rect width="1600" height="900" fill="url(#landing-map-grid)" />
          <ellipse cx="1260" cy="190" rx="430" ry="300" fill="url(#landing-map-wash)" />
          <ellipse cx="260" cy="760" rx="460" ry="270" fill="url(#landing-map-wash)" />

          <g className="landing-map-districts">
            <path d="M-70 80 260 22 430 176 350 362 70 330Z" />
            <path d="M430-20 770 25 825 212 635 320 382 176Z" />
            <path d="M1020-30 1420-18 1630 205 1470 340 1160 260Z" />
            <path d="M-45 530 250 430 465 565 390 870 32 940Z" />
            <path d="M1005 530 1260 405 1535 490 1660 850 1250 930 1010 748Z" />
          </g>
          <path className="landing-map-park" d="M720 495c105-74 214-67 273 15 65 91-17 201-139 196-108-4-224-130-134-211Z" />
          <path className="landing-map-water" fill="url(#landing-map-water)" d="M-80 430C166 347 258 424 407 386c185-48 250-195 447-170 173 21 208 170 393 154 147-13 231-113 433-88v115c-196-16-299 99-453 108-207 13-244-148-420-161-168-13-252 131-414 162-172 32-270-39-473 40Z" />

          <g className="landing-map-roads-minor">
            <path d="M-60 112 330 184 682 80 1035 155 1660 92" />
            <path d="M-80 327 270 284 540 405 913 334 1220 412 1670 330" />
            <path d="M-90 582 260 500 558 620 810 540 1120 650 1660 552" />
            <path d="M-50 790 310 705 610 830 920 710 1260 812 1640 735" />
            <path d="M130-40 205 210 125 470 260 720 230 950" />
            <path d="M420-50 520 205 430 450 560 700 515 960" />
            <path d="M735-60 680 230 770 455 690 690 780 960" />
            <path d="M1050-60 970 190 1090 410 1010 665 1100 950" />
            <path d="M1370-40 1290 230 1410 470 1325 690 1450 950" />
            <path d="M20 665 310 610 520 350 720 270 945 64" />
            <path d="M590 930 790 690 1060 590 1280 300 1570 170" />
            <path d="M935 900 1130 730 1360 690 1575 490" />
          </g>

          <g className="landing-map-roads-major">
            <path d="M-100 690C180 600 300 755 520 610S840 320 1060 438s320 185 650 30" />
            <path d="M-90 220c310 130 445-85 720 45s520 30 730-80 280-72 360-40" />
            <path d="M330-80c-5 250 120 355 61 565S250 735 300 980" />
            <path d="M1270-80c70 210-24 365 50 535s225 234 180 520" />
          </g>
          <g className="landing-map-road-centers">
            <path pathLength="1" d="M-100 690C180 600 300 755 520 610S840 320 1060 438s320 185 650 30" />
            <path pathLength="1" d="M-90 220c310 130 445-85 720 45s520 30 730-80 280-72 360-40" />
            <path pathLength="1" d="M330-80c-5 250 120 355 61 565S250 735 300 980" />
            <path pathLength="1" d="M1270-80c70 210-24 365 50 535s225 234 180 520" />
          </g>

          <g className="landing-map-routes">
            <path id="landing-route-a" className="landing-map-route landing-map-route-primary" pathLength="1" d="M-90 720C130 610 210 720 390 570S680 350 830 460s220 260 400 95 220-245 460-155" />
            <path id="landing-route-b" className="landing-map-route landing-map-route-secondary" pathLength="1" d="M-100 250C170 340 270 160 500 240s270 150 455 30S1260 90 1700 180" />
            <path id="landing-route-c" className="landing-map-route landing-map-route-tertiary" pathLength="1" d="M230 940c120-220 340-160 470-290s110-290 340-315 330 155 570-55" />
            <path id="landing-route-d" className="landing-map-route landing-map-route-four" pathLength="1" d="M30 70c210 105 290 275 185 430S25 745 90 930" />
            <path id="landing-route-e" className="landing-map-route landing-map-route-five" pathLength="1" d="M1510-40c-125 175-172 315-72 452s75 272-28 528" />
          </g>

          <g className="landing-map-labels">
            <g transform="translate(125 92)"><rect width="116" height="30" rx="15" /><text x="58" y="19">08:42 - START</text></g>
            <g transform="translate(1365 110)"><rect width="124" height="30" rx="15" /><text x="62" y="19">12.4 KM MAPPED</text></g>
            <g transform="translate(125 815)"><rect width="108" height="30" rx="15" /><text x="54" y="19">18:20 - HOME</text></g>
            <g transform="translate(1320 790)"><rect width="136" height="30" rx="15" /><text x="68" y="19">JOURNEY COMPLETE</text></g>
          </g>

          <g className="landing-map-compass" transform="translate(1480 450)">
            <circle r="28" />
            <path d="m0-18 6 18-6 18-6-18Z" />
            <text x="0" y="-35">N</text>
          </g>
        </svg>
        <span className="landing-map-live">LIVE TIMELINE</span>
        <span className="landing-map-coordinates">6.2088 S / 106.8456 E</span>
      </div>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <h1 id="landing-title">Your journeys,<br /><em>beautifully mapped.</em></h1>
          <p>Turn your Google Maps Timeline export into an interactive map and moving journey video. No account, upload, or tracking.</p>
          <div className="trust-row" aria-label="Privacy promises">
            <span>Local processing</span>
            <span>Open source</span>
            <span>No sign-up</span>
          </div>

          <div className="landing-support" aria-label="How it works">
            <article>
              <strong>01</strong>
              <h2>Export</h2>
              <p>Android Settings - Location - Timeline - Export Timeline data.</p>
            </article>
            <article>
              <strong>02</strong>
              <h2>Import locally</h2>
              <p>Choose Timeline JSON files or a Takeout ZIP. Parsing stays in browser memory.</p>
            </article>
            <article>
              <strong>03</strong>
              <h2>Explore</h2>
              <p>Filter journeys, inspect stats, create a short, or export GeoJSON and CSV.</p>
            </article>
          </div>

          <div className="landing-privacy">
            <strong>MIT licensed.</strong>
            <p>Not affiliated with or endorsed by Google.</p>
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
              View on GitHub <span aria-hidden="true">{"\u2197"}</span>
            </a>
          </div>
        </div>

        <div className={`import-card ${dragging ? "is-dragging" : ""}`}>
          <div className="import-card-top">
            <span className="step-label">01 - IMPORT</span>
            <span className="format-label">JSON | ZIP</span>
          </div>
          <div
            className="drop-zone"
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptFiles(event.dataTransfer.files);
            }}
          >
            <input
              ref={inputRef}
              hidden
              type="file"
              multiple
              accept=".json,.zip,application/json,application/zip"
              onChange={(event) => acceptFiles(event.target.files)}
            />
            <span className="upload-glyph" aria-hidden="true">{"\u2191"}</span>
            <h2>{busy ? "Reading your journey..." : "Drop your Timeline export"}</h2>
            <p>{busy ? progress : "or choose files from your device"}</p>
            {busy ? (
              <button className="secondary-button" type="button" onClick={onCancel}>Cancel import</button>
            ) : (
              <button type="button" onClick={() => inputRef.current?.click()}>Choose files</button>
            )}
            {!busy && <button className="text-button" type="button" onClick={onDemo}>Explore demo</button>}
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <p className="import-note">Supports Timeline.json, Semantic Location History, Records.json, monthly JSON files, and Takeout ZIP archives.</p>
        </div>
      </section>
    </main>
  );
}
