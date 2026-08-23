import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import { eventsToGeoJSON, type TimelineEvent } from "@/core/timeline";
import { MAP_STYLE_URL } from "@/shared/config/map";

interface TimelineMapProps {
  events: TimelineEvent[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

const featureCollection = (events: TimelineEvent[]) => eventsToGeoJSON(events);

export function TimelineMap({ events, selectedId, onSelect }: TimelineMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const datasetKey = useMemo(() => `${events.length}:${events[0]?.id || ""}:${events.at(-1)?.id || ""}`, [events]);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;
    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (disposed || !containerRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
      style: MAP_STYLE_URL,
        center: [0, 18],
        zoom: 1.4,
        attributionControl: {},
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
      map.on("load", () => setReady(true));
      map.on("error", () => setMapError(true));
      map.on("click", "visits-point", (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      map.on("click", "movements-line", (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      for (const layer of ["visits-point", "movements-line"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }
      mapRef.current = map;
    });
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visits = events.filter((event) => event.kind === "visit");
    const movements = events.filter((event) => event.kind === "movement");
    const samples = events.filter((event) => event.kind === "sample");
    const sources = [
      ["visits", featureCollection(visits)],
      ["movements", featureCollection(movements)],
      ["samples", featureCollection(samples)],
    ] as const;
    for (const [id, data] of sources) {
      const existing = map.getSource(id) as GeoJSONSource | undefined;
      if (existing) existing.setData(data);
      else map.addSource(id, { type: "geojson", data, cluster: id === "visits", clusterMaxZoom: 13, clusterRadius: 46 });
    }
    if (!map.getLayer("samples-heat")) {
      map.addLayer({
        id: "samples-heat",
        type: "heatmap",
        source: "samples",
        maxzoom: 14,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["coalesce", ["get", "accuracy"], 50], 0, 1, 200, 0.2],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.45, 12, 1.6],
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(216,255,95,0)", 0.35, "#a9e6cd", 0.7, "#ffb55f", 1, "#ff7145"],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 13, 17],
          "heatmap-opacity": 0.72,
        },
      });
    }
    if (!map.getLayer("movements-line")) {
      map.addLayer({
        id: "movements-line",
        type: "line",
        source: "movements",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["match", ["get", "activityType"], "Walking", "#ff7145", "Cycling", "#376f5a", "Driving", "#7657d6", "#f18f36"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, 2, 13, 5],
          "line-opacity": 0.9,
        },
      });
    }
    if (!map.getLayer("visits-cluster")) {
      map.addLayer({ id: "visits-cluster", type: "circle", source: "visits", filter: ["has", "point_count"], paint: { "circle-color": "#172c24", "circle-radius": ["step", ["get", "point_count"], 15, 20, 20, 100, 25], "circle-stroke-color": "#d8ff5f", "circle-stroke-width": 3 } });
      map.addLayer({ id: "visits-count", type: "symbol", source: "visits", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 11 }, paint: { "text-color": "#ffffff" } });
      map.addLayer({ id: "visits-point", type: "circle", source: "visits", filter: ["!", ["has", "point_count"]], paint: { "circle-color": "#ff7145", "circle-radius": 7, "circle-stroke-color": "#f3f0e7", "circle-stroke-width": 3 } });
    }

    const coordinates = events.flatMap((event) => event.kind === "movement" ? event.path : [event.position]);
    if (coordinates.length) {
      const bounds = new maplibreBounds(coordinates[0], coordinates[0]);
      coordinates.forEach((coordinate) => bounds.extend(coordinate));
      map.fitBounds(bounds.toArray(), { padding: 70, duration: 700, maxZoom: 14 });
    }
  }, [datasetKey, events, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const selected = events.find((event) => event.id === selectedId);
    const data = featureCollection(selected ? [selected] : []);
    const existing = map.getSource("selected") as GeoJSONSource | undefined;
    if (existing) existing.setData(data);
    else {
      map.addSource("selected", { type: "geojson", data });
      map.addLayer({ id: "selected-line", type: "line", source: "selected", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#d8ff5f", "line-width": 8, "line-opacity": 0.85 } });
      map.addLayer({ id: "selected-point", type: "circle", source: "selected", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-color": "#d8ff5f", "circle-radius": 11, "circle-stroke-color": "#172c24", "circle-stroke-width": 4 } });
    }
    if (selected) {
      const center = selected.kind === "movement" ? selected.path[Math.floor(selected.path.length / 2)] : selected.position;
      map.easeTo({ center, zoom: Math.max(map.getZoom(), 11), duration: 650 });
    }
  }, [selectedId, events, ready]);

  return (
    <div className="map-shell">
      <div ref={containerRef} className="timeline-map" aria-label="Interactive map of imported timeline data" />
      {!ready && !mapError && <div className="map-status">Loading map canvas…</div>}
      {mapError && <div className="map-status map-status-error">Basemap unavailable. Your imported data remains local and safe.</div>}
      <div className="map-privacy-badge"><span /> Timeline data stays local</div>
    </div>
  );
}

class maplibreBounds {
  private west: number;
  private south: number;
  private east: number;
  private north: number;

  constructor(sw: [number, number], ne: [number, number]) {
    this.west = sw[0]; this.south = sw[1]; this.east = ne[0]; this.north = ne[1];
  }
  extend([longitude, latitude]: [number, number]) {
    this.west = Math.min(this.west, longitude); this.east = Math.max(this.east, longitude);
    this.south = Math.min(this.south, latitude); this.north = Math.max(this.north, latitude);
    return this;
  }
  toArray() { return [[this.west, this.south], [this.east, this.north]] as [[number, number], [number, number]]; }
}
