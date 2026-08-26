import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import type { Position } from "@/core/timeline";
import { MAP_STYLE_URL } from "@/shared/config/map";
import type { JourneyFrame, JourneyTrack } from "../model/journey-track";
import type { JourneyCameraPhase, JourneyCameraState, JourneyCameraTuning, VideoMapMode } from "../model/video-settings";

const LINE_FRAME_INTERVAL_MS = 1000 / 30;

interface CameraSnapshot {
  center: Position;
  zoom: number;
}

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

const normalizeLongitude = (longitude: number) => ((longitude + 540) % 360) - 180;
const easeInOutCubic = (progress: number) => progress < 0.5
  ? 4 * progress * progress * progress
  : 1 - Math.pow(-2 * progress + 2, 3) / 2;

const interpolatePosition = (from: Position, to: Position, progress: number): Position => {
  let longitudeDelta = to[0] - from[0];
  if (longitudeDelta > 180) longitudeDelta -= 360;
  if (longitudeDelta < -180) longitudeDelta += 360;
  return [
    normalizeLongitude(from[0] + longitudeDelta * progress),
    from[1] + (to[1] - from[1]) * progress,
  ];
};

const mapSnapshot = (map: MapLibreMap): CameraSnapshot => {
  const center = map.getCenter();
  return { center: [center.lng, center.lat], zoom: map.getZoom() };
};

export function useStudioMap(track: JourneyTrack, cameraTuning: JourneyCameraTuning) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const mapReadyRef = useRef(false);
  const overviewCameraRef = useRef<CameraSnapshot | null>(null);
  const transitionStartRef = useRef<CameraSnapshot | null>(null);
  const displayCameraRef = useRef<CameraSnapshot | null>(null);
  const cameraPhaseRef = useRef<JourneyCameraPhase>("idle");
  const lastCameraFrameRef = useRef(0);
  const lastLineFrameRef = useRef(0);
  const completedSignatureRef = useRef("");
  const previewPixelRatioRef = useRef<number | null>(null);
  const cameraTuningRef = useRef(cameraTuning);
  const [mapReady, setMapReady] = useState(false);
  const [mapFallback, setMapFallback] = useState(false);

  useEffect(() => {
    cameraTuningRef.current = cameraTuning;
  }, [cameraTuning]);

  const updateMapFrame = useCallback((frame: JourneyFrame, camera: JourneyCameraState) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    const now = performance.now();
    const previousPhase = cameraPhaseRef.current;
    const overview = camera.phase === "overview";
    const completedPaths = overview ? track.movements.map((movement) => movement.path) : frame.completedPaths;
    const completedSignature = `${overview ? "overview" : "journey"}:${completedPaths.length}`;
    if (completedSignatureRef.current !== completedSignature) {
      (map.getSource("journey-completed") as GeoJSONSource | undefined)?.setData(lineCollection(completedPaths));
      completedSignatureRef.current = completedSignature;
    }
    if (
      now - lastLineFrameRef.current >= LINE_FRAME_INTERVAL_MS
      || camera.phase === "idle"
      || (camera.phase === "overview" && previousPhase !== "overview")
    ) {
      const activePaths = overview || !frame.activePath.length ? [] : [frame.activePath];
      (map.getSource("journey-active") as GeoJSONSource | undefined)?.setData(lineCollection(activePaths));
      lastLineFrameRef.current = now;
    }
    if (frame.position) markerRef.current?.setLngLat(frame.position);

    const overviewCamera = overviewCameraRef.current;
    const targetPosition = frame.position;
    const followZoom = Math.min(cameraTuningRef.current.followZoom, map.getMaxZoom() - 0.25);

    if (camera.phase === "idle" && overviewCamera) {
      map.jumpTo({ center: overviewCamera.center, zoom: overviewCamera.zoom });
      displayCameraRef.current = overviewCamera;
      transitionStartRef.current = overviewCamera;
    } else if (camera.phase === "intro" && overviewCamera && targetPosition) {
      const eased = easeInOutCubic(camera.progress);
      const nextCamera = {
        center: interpolatePosition(overviewCamera.center, targetPosition, eased),
        zoom: overviewCamera.zoom + (followZoom - overviewCamera.zoom) * eased,
      };
      map.jumpTo(nextCamera);
      displayCameraRef.current = nextCamera;
      transitionStartRef.current = nextCamera;
    } else if (camera.phase === "follow" && targetPosition) {
      const previous = displayCameraRef.current ?? mapSnapshot(map);
      const elapsedSeconds = lastCameraFrameRef.current
        ? Math.min(0.1, (now - lastCameraFrameRef.current) / 1000)
        : 1 / 60;
      const response = 1 - Math.exp(-elapsedSeconds / cameraTuningRef.current.responseSeconds);
      const nextCamera = {
        center: interpolatePosition(previous.center, targetPosition, response),
        zoom: previous.zoom + (followZoom - previous.zoom) * Math.min(1, response * 1.35),
      };
      map.jumpTo(nextCamera);
      displayCameraRef.current = nextCamera;
      transitionStartRef.current = nextCamera;
    } else if (camera.phase === "overview" && overviewCamera) {
      if (previousPhase !== "overview" || !transitionStartRef.current) {
        transitionStartRef.current = displayCameraRef.current ?? mapSnapshot(map);
      }
      const start = transitionStartRef.current;
      const eased = easeInOutCubic(camera.progress);
      const nextCamera = {
        center: interpolatePosition(start.center, overviewCamera.center, eased),
        zoom: start.zoom + (overviewCamera.zoom - start.zoom) * eased,
      };
      map.jumpTo(nextCamera);
      displayCameraRef.current = nextCamera;
    }

    cameraPhaseRef.current = camera.phase;
    lastCameraFrameRef.current = now;
    map.triggerRepaint();
  }, [track.movements]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let disposed = false;
    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (disposed || !mapContainerRef.current) return;
      const initialPosition = track.frameAt(0).position;
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE_URL,
        center: initialPosition ?? [0, 18],
        zoom: initialPosition ? 9 : 2,
        attributionControl: {},
        canvasContextAttributes: {
          antialias: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        },
        cancelPendingTileRequestsWhileZooming: false,
        maxCanvasSize: [4096, 4096],
      });
      map.on("load", () => {
        map.addSource("journey-completed", { type: "geojson", data: lineCollection([]) });
        map.addSource("journey-active", { type: "geojson", data: lineCollection([]) });
        map.addSource("journey-visits", { type: "geojson", data: pointCollection(track.visits.map((visit) => visit.position)) });
        map.addLayer({ id: "journey-completed", type: "line", source: "journey-completed", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ff7145", "line-width": 5, "line-opacity": 0.38 } });
        map.addLayer({ id: "journey-active", type: "line", source: "journey-active", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#d8ff5f", "line-width": 8, "line-opacity": 0.95 } });
        map.addLayer({ id: "journey-visits", type: "circle", source: "journey-visits", paint: { "circle-color": "#ff7145", "circle-radius": 5, "circle-stroke-color": "#f3f0e7", "circle-stroke-width": 2 } });

        const markerElement = document.createElement("div");
        markerElement.className = "studio-map-marker";
        markerRef.current = new maplibregl.Marker({ element: markerElement, anchor: "center" })
          .setLngLat(initialPosition ?? [0, 18])
          .addTo(map);

        if (track.bounds) {
          map.fitBounds(
            [[track.bounds.west, track.bounds.south], [track.bounds.east, track.bounds.north]],
            { padding: 72, duration: 0, maxZoom: 10.5 },
          );
        }
        overviewCameraRef.current = mapSnapshot(map);
        displayCameraRef.current = overviewCameraRef.current;
        transitionStartRef.current = overviewCameraRef.current;
        mapReadyRef.current = true;
        setMapReady(true);
        updateMapFrame(track.frameAt(0), { phase: "idle", progress: 0 });
      });
      map.on("error", () => setMapFallback(true));
      mapRef.current = map;
    });
    return () => {
      disposed = true;
      mapReadyRef.current = false;
      markerRef.current?.remove();
      markerRef.current = null;
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

  const prepareBasemapCapture = useCallback((width: number, height: number) => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!map || !container || !container.clientWidth || !container.clientHeight) return;
    if (previewPixelRatioRef.current === null) previewPixelRatioRef.current = map.getPixelRatio();
    const capturePixelRatio = Math.max(
      width / container.clientWidth,
      height / container.clientHeight,
    );
    map.setPixelRatio(capturePixelRatio);
    map.resize();
    map.redraw();
  }, []);

  const restoreBasemapCapture = useCallback(() => {
    const map = mapRef.current;
    const previewPixelRatio = previewPixelRatioRef.current;
    if (!map || previewPixelRatio === null) return;
    previewPixelRatioRef.current = null;
    map.setPixelRatio(previewPixelRatio);
    map.resize();
    map.redraw();
  }, []);

  return {
    mapContainerRef,
    mapRef,
    mapReady,
    mapFallback,
    setMapFallback,
    updateMapFrame,
    basemapIsRecordable,
    projectBasemap,
    prepareBasemapCapture,
    restoreBasemapCapture,
  };
}
