# Contributing

Thank you for helping make Timeline Map Visualizer safer and more useful.

## Before opening a pull request

1. Open an issue for substantial behavior or parser-contract changes.
2. Never attach or commit a real Timeline export, coordinate history, Place ID, address, or other personal location data.
3. Add or update a small synthetic fixture for parser changes.
4. Keep format-specific logic inside an adapter and normalize it to the shared `TimelineEvent` union.
5. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

## Development

Use Node.js 22.13 or newer and install dependencies with `npm install`. The app runs at `http://localhost:3000` with `npm run dev`.

The project uses TypeScript, React, MapLibre GL JS, Vitest, Testing Library, and Playwright. Keep user-facing text in English for v1, preserve keyboard access, and test mobile behavior for UI changes.

Follow the boundaries in [Project structure](docs/architecture/project-structure.md). Parser changes should also follow [Parser architecture](docs/architecture/parser.md). Unit and component tests live next to the source they cover; cross-feature fixtures and Playwright tests remain under `tests/`.

## Privacy review

Changes that add a network destination, browser persistence, telemetry, geocoding, or file upload must be discussed before implementation. Pull requests must explain what data crosses the browser boundary and why.

## Commit and pull request style

Use concise conventional subjects such as `feat: support parking segments` or `fix: preserve UTC timestamps`. Keep each pull request focused and describe verification performed.
