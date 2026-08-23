# Parser architecture

The importer separates proprietary source shapes from the UI through a normalized, discriminated `TimelineEvent` union.

## Pipeline

1. A dedicated Web Worker receives selected `File` objects.
2. ZIP entries are extracted with the streaming `fflate` API; non-JSON entries are ignored.
3. The importer scans a small prefix for a supported root array and configures `@streamparser/json` to emit one array item at a time with `keepStack: false`.
4. The matching adapter converts each item into `VisitEvent`, `MovementEvent`, or `SampleEvent`.
5. Invalid entries produce aggregate warning codes. Stable IDs deduplicate events across overlapping files.
6. The UI receives sorted normalized events and never reads proprietary source fields.

## Adapter registry

| Format | Root path | Adapter |
| --- | --- | --- |
| `device-timeline` | `$.semanticSegments.*` | `parseDeviceSegment` |
| `legacy-semantic` | `$.timelineObjects.*` | `parseLegacyTimelineObject` |
| `legacy-records` | `$.locations.*` | `parseRawLocation` |

Coordinates are normalized to WGS84 `[longitude, latitude]`. Timestamps become epoch milliseconds. GeoJSON and CSV exports convert them to ISO-8601 UTC.

## Adding a format

1. Add a `SourceFormat` member and a detector for an unambiguous root key.
2. Implement an adapter that validates timestamps and coordinate bounds.
3. Do not infer a route when only unrelated raw samples are available.
4. Add a fully synthetic fixture and tests for missing fields, malformed coordinates, and malformed timestamps.
5. Keep warnings generic; never copy source values into logs or UI errors.

## Resource limits

The worker stops after 1 GiB of decompressed input. Map rendering deterministically samples raw points above 100,000, while statistics and exports continue to use the filtered normalized dataset.
