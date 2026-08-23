# Timeline Map Visualizer

![Timeline Map Visualizer](public/og.png)

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

Open `http://localhost:3000`. You can select **Explore synthetic demo** without using personal data.

Optional environment values:

```bash
cp .env.example .env.local
```

- `VITE_MAP_STYLE_URL` changes the MapLibre style provider.
- `VITE_REPOSITORY_URL` changes the repository link shown in the UI.
- `VITE_SITE_URL` sets the absolute URL used in social metadata.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Playwright requires its browser packages (`npx playwright install --with-deps`) before the end-to-end suite can run.

## Supported data contracts

| Source | Detection key | Normalized output |
| --- | --- | --- |
| Device Timeline export | `semanticSegments` | visits, activities, recorded timeline paths |
| Legacy Semantic Location History | `timelineObjects` | place visits and activity segments |
| Legacy raw Location History | `locations` | individual samples rendered as points/heatmap |

Raw samples are never connected into invented routes. Activity lines only use geometry present in the source export. Read [Parser architecture](docs/architecture/parser.md) before adding a format adapter.

The repository uses a core + feature-first layout. See [Project structure](docs/architecture/project-structure.md) for dependency rules and file placement guidance.

## Journey Video Studio

After importing data, select **Create short** to open the full-screen video studio. The studio animates only movement geometry present in the export, pauses on visits, fades older travel, and ends with a 1.5-second overview.

- Aspect ratios: portrait `9:16`, square `1:1`, and landscape `16:9`.
- Journey durations: 10, 15, 30, or 60 seconds, plus the ending overview.
- Resolutions: 720p standard and 1080p HD at 30 FPS.
- Soundtracks: three bundled CC0 instrumental loops, no music, or a local audio file selected by the user.
- Output: MP4 when the browser exposes a compatible H.264/AAC recorder, otherwise WebM VP9/Opus or VP8/Opus.

Preview and recording use the same deterministic journey model. If the configured tile provider prevents its canvas from being recorded, the export automatically switches to a local minimal map instead of failing or uploading data. Browser encoding is real-time: a 15-second journey plus its ending takes about 16.5 seconds to create.

Bundled soundtrack provenance and checksums are documented in [`public/audio/LICENSES.md`](public/audio/LICENSES.md). Uploaded audio remains an in-memory object URL and is released when the studio closes.

Maintainers can deterministically rebuild the original soundtrack assets with `npm run music:generate`; update the documented checksums whenever the generator changes.

## Privacy and security

- No account, backend, database, analytics, remote geocoder, or Timeline upload.
- Imported events are not written to localStorage or IndexedDB.
- Timeline data, uploaded music, rendered frames, and completed videos are never sent to an application server.
- Only non-sensitive UI preferences may be persisted in future versions.
- ZIP extraction stops after 1 GiB of decompressed Timeline data.
- Parser errors use generic messages and never include raw coordinates or source contents.
- Synthetic fixtures are the only location data committed to this repository.

Please report sensitive issues according to [SECURITY.md](SECURITY.md).

## Deployment

The included workflows run checks for every pull request and publish the static export to GitHub Pages after a push to `main`. Enable **Settings → Pages → GitHub Actions** in the GitHub repository. Configure `VITE_REPOSITORY_URL` in the workflow or repository variables once the final repository URL is known.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License and trademark notice

Released under the [MIT License](LICENSE).

Timeline Map Visualizer is an independent project and is not affiliated with, endorsed by, or sponsored by Google. Google Maps and Google are trademarks of Google LLC.
