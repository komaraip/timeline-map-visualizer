# Timeline Map Visualizer

![Timeline Map Visualizer](public/img/og.png)

A privacy-first, open-source web app for exploring Google Maps Timeline exports. Import your data, filter visits and journeys, inspect useful statistics, and export a portable copy—without sending the Timeline file to a server.

> [!IMPORTANT]
> Timeline files are processed in browser memory. The configured basemap provider still receives ordinary tile requests for the area visible on screen, but never receives the contents of the imported file.

## Features

- Import a device-local `Timeline.json`, legacy Semantic Location History files, `Records.json`, multiple monthly JSON files, or a Takeout ZIP.
- Automatically detect `semanticSegments`, `timelineObjects`, and `locations` formats.
- Explore clustered visits, activity paths, and raw-point heatmaps with MapLibre GL JS.
- Filter by date, event type, activity, and display time zone.
- Review visits, active days, recorded duration, and mapped distance.
- Turn the current filtered journey into a 9:16, 1:1, or 16:9 animated short with local music.
- Export filtered events as GeoJSON or CSV with ISO-8601 UTC timestamps.
- Clear all imported data from memory with one action.

## Export your Timeline

On a supported Android device:

1. Open **Settings**.
2. Select **Location → Location services → Timeline**.
3. Select **Export Timeline data**, continue, and choose where to save the file.

Google may change these steps. Refer to the [official Timeline help page](https://support.google.com/maps/answer/6258979?co=GENIE.Platform%3DAndroid&hl=en) for the current instructions.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. You can select **Explore synthetic demo** without using personal data.

Optional environment values:

```bash
cp .env.example .env.local
```

- `VITE_MAP_STYLE_URL` changes the MapLibre style provider.
- `VITE_REPOSITORY_URL` changes the repository link shown in the UI.
- `VITE_SITE_URL` sets the absolute URL used in social metadata.

To preview a production build locally:

```bash
npm run build
npm run preview
```

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Supported data contracts

| Source | Detection key | Normalized output |
| --- | --- | --- |
| Device Timeline export | `semanticSegments` | visits, activities, recorded timeline paths |
| Legacy Semantic Location History | `timelineObjects` | place visits and activity segments |
| Legacy raw Location History | `locations` | individual samples rendered as points/heatmap |

Raw samples are never connected into invented routes. Activity lines only use geometry present in the source export.

## Architecture

- `index.html` contains the document shell and social metadata.
- `src/main.tsx` mounts the React application, while `src/styles/globals.css` aggregates global and feature styles.
- `src/core/timeline/` contains normalized event contracts, analytics, parser adapters, and export transforms.
- `src/features/` contains Timeline import, explorer, and Journey Video capabilities.
- `src/shared/` contains reusable UI, formatters, and environment configuration.
- `scripts/` contains Node-based project tooling.

Timeline parsing runs inside a Web Worker. Format adapters live in `src/core/timeline/parsing/adapters/`, normalize coordinates to WGS84 `[longitude, latitude]`, convert timestamps to epoch milliseconds, and expose only the shared `TimelineEvent` contract to feature code. New adapters must preserve source geometry, reject malformed values, and never include raw Timeline values in warnings.

## Journey Video Studio

After importing data, select **Create short** to open the full-screen video studio. The studio animates only movement geometry present in the export, pauses on visits, fades older travel, and ends with a 1.5-second overview.

- Aspect ratios: portrait `9:16`, square `1:1`, and landscape `16:9`.
- Journey durations: 10, 15, 30, or 60 seconds, plus the ending overview.
- Resolutions: 720p standard and 1080p HD at 30 FPS.
- Soundtracks: three bundled CC0 instrumental loops, no music, or a local audio file selected by the user.
- Output: MP4 when the browser exposes a compatible H.264/AAC recorder, otherwise WebM VP9/Opus or VP8/Opus.

Preview and recording use the same deterministic journey model. If the configured tile provider prevents its canvas from being recorded, the export automatically switches to a local minimal map instead of failing or uploading data. Browser encoding is real-time: a 15-second journey plus its ending takes about 16.5 seconds to create.

The bundled soundtracks were generated specifically for this project by `scripts/generate-soundtracks.mjs`, contain no third-party samples, and are dedicated to the public domain under CC0 1.0. Uploaded audio remains an in-memory object URL and is released when the studio closes.

| Soundtrack | SHA-256 |
| --- | --- |
| Ambient Drift | `76684482ce7b2aa6c6897f682d2963d3dada851098cc724c5830867f689d5c37` |
| Bright Miles | `b6e6a44723776a188a2f82c9531a3a4141e83ce8fd6249b12929acb7d29c7910` |
| Cinematic Rise | `2db8feb24836ba3768e81ed3a4477fce64fd5ab51317f7035509ac6fb76bcd4a` |

Maintainers can deterministically rebuild the original soundtrack assets with `npm run music:generate`; update the documented checksums whenever the generator changes.

## Privacy and security

- No account, backend, database, analytics, remote geocoder, or Timeline upload.
- Imported events are not written to localStorage or IndexedDB.
- Timeline data, uploaded music, rendered frames, and completed videos are never sent to an application server.
- Only non-sensitive UI preferences may be persisted in future versions.
- ZIP extraction stops after 1 GiB of decompressed Timeline data.
- Parser errors use generic messages and never include raw coordinates or source contents.
- Only synthetic demonstration data is committed to this repository.

Report vulnerabilities through GitHub private vulnerability reporting. Never attach a real Timeline export or personal coordinates to an issue or report.

## Deployment

The included workflows run typecheck, lint, and build validation for every pull request and publish the Vite output from `dist/` to GitHub Pages after a push to `main`. Enable **Settings → Pages → GitHub Actions** in the GitHub repository. Configure `VITE_REPOSITORY_URL` in the workflow or repository variables once the final repository URL is known.

## Contributing

Contributions are welcome. Keep format-specific logic inside parser adapters, use only synthetic data for manual validation, run `npm run check`, and explain privacy or network changes in the pull request. Contributors must communicate respectfully and never post another person's location data or identifiers.

## License and trademark notice

Released under the [MIT License](LICENSE.md).

Timeline Map Visualizer is an independent project and is not affiliated with, endorsed by, or sponsored by Google. Google Maps and Google are trademarks of Google LLC.
