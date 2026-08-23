import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { Position } from "@/core/timeline";
import { MAP_STYLE_URL } from "@/shared/config/map";
import type { JourneyFrame, JourneyTrack } from "../model/journey-track";
import type { VideoMapMode } from "../model/video-settings";

const lineCollection = (paths: Position[][]) => ({
  type: "FeatureCollection" as const,
  features: paths.filter((path) => path.length > 1).map((path, index) => ({
    type: "Feature" as const, id: index, properties: {},
    geometry: { type: "LineString" as const, coordinates: path },
  })),
});

const pointCollection = (positions: Position[]) => ({
  type: "FeatureCollection" as const,
  features: positions.map((position, index) => ({
    type: "Feature" as const, id: index, properties: {},
    geometry: { type: "Point" as const, coordinates: position },
  })),
});

export function useStudioMap(track: JourneyTrack) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapFallback, setMapFallback] = useState(false);

  const updateMapFrame = useCallback((frame: JourneyFrame, overview = false) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    (map.getSource("journey-completed") as GeoJSONSource | undefined)?.setData(lineCollection(frame.completedPaths));
    (map.getSource("journey-active") as GeoJSONSource | undefined)?.setData(lineCollection(frame.activePath.length ? [frame.activePath] : []));
    (map.getSource("journey-marker") as GeoJSONSource | undefined)?.setData(pointCollection(frame.position ? [frame.position] : []));
    if (overview && track.bounds) {
      map.fitBounds([[track.bounds.west, track.bounds.south], [track.bounds.east, track.bounds.north]], { padding: 72, duration: 0, maxZoom: 14 });
    } else if (frame.position) {
      map.jumpTo({ center: frame.position, zoom: Math.max(8, Math.min(12.5, map.getZoom())) });
    }
  }, [track.bounds]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let disposed = false;
    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (disposed || !mapContainerRef.current) return;
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE_URL,
        center: track.frameAt(0).position ?? [0, 18],
        zoom: 9,
        attributionControl: {},
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
      map.on("load", () => {
        map.addSource("journey-completed", { type: "geojson", data: lineCollection([]) });
        map.addSource("journey-active", { type: "geojson", data: lineCollection([]) });
        map.addSource("journey-visits", { type: "geojson", data: pointCollection(track.visits.map((visit) => visit.position)) });
        map.addSource("journey-marker", { type: "geojson", data: pointCollection([]) });
        map.addLayer({ id: "journey-completed", type: "line", source: "journey-completed", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ff7145", "line-width": 5, "line-opacity": 0.38 } });
        map.addLayer({ id: "journey-active", type: "line", source: "journey-active", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#d8ff5f", "line-width": 8, "line-opacity": 0.95 } });
        map.addLayer({ id: "journey-visits", type: "circle", source: "journey-visits", paint: { "circle-color": "#ff7145", "circle-radius": 5, "circle-stroke-color": "#f3f0e7", "circle-stroke-width": 2 } });
        map.addLayer({ id: "journey-marker", type: "circle", source: "journey-marker", paint: { "circle-color": "#172c24", "circle-radius": 10, "circle-stroke-color": "#d8ff5f", "circle-stroke-width": 4 } });
        mapReadyRef.current = true;
        setMapReady(true);
        updateMapFrame(track.frameAt(0));
      });
      map.on("error", () => setMapFallback(true));
      mapRef.current = map;
    });
    return () => {
      disposed = true;
      mapReadyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [track, updateMapFrame]);

  const basemapIsRecordable = useCallback((mapMode: VideoMapMode) => {
    if (mapMode === "minimal" || mapFallback || !mapRef.current) return false;
    try {
      const scratch = document.createElement("canvas");
      scratch.width = 2; scratch.height = 2;
      const context = scratch.getContext("2d");
      if (!context) return false;
      context.drawImage(mapRef.current.getCanvas(), 0, 0, 2, 2);
      scratch.toDataURL("image/png");
      return true;
    } catch {
      return false;
    }
  }, [mapFallback]);

  const projectBasemap = useCallback((position: Position, width: number, height: number) => {
    const projected = mapRef.current?.project(position);
    const container = mapContainerRef.current;
    if (!projected || !container) return { x: width / 2, y: height / 2 };
    return { x: projected.x / container.clientWidth * width, y: projected.y / container.clientHeight * height };
  }, []);

  return { mapContainerRef, mapRef, mapReady, mapFallback, setMapFallback, updateMapFrame, basemapIsRecordable, projectBasemap };
}
