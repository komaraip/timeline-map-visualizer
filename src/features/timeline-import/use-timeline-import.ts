"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportReport, TimelineEvent } from "@/core/timeline";
import ImportWorker from "./import.worker?worker";
import type { ImportWorkerRequest, ImportWorkerResponse } from "./import.types";

export function useTimelineImport() {
  const workerRef = useRef<Worker | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("Preparing your files…");
  const [error, setError] = useState("");

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => stopWorker, [stopWorker]);

  const importFiles = useCallback((files: File[]) => {
    stopWorker();
    const worker = new ImportWorker({ type: "module" });
    workerRef.current = worker;
    setBusy(true);
    setError("");
    setProgress("Opening files safely…");
    worker.onmessage = (message: MessageEvent<ImportWorkerResponse>) => {
      if (message.data.type === "progress") {
        setProgress(`${message.data.accepted.toLocaleString()} events · ${message.data.fileName || "processing"}`);
      }
      if (message.data.type === "complete") {
        setEvents(message.data.events);
        setReport(message.data.report);
        setBusy(false);
        if (!message.data.events.length) setError("No supported Timeline events were found in those files.");
      }
      if (message.data.type === "error") {
        setError(message.data.message || "Import failed.");
        setReport(message.data.report);
        setBusy(false);
      }
      if (message.data.type === "cancelled") setBusy(false);
    };
    worker.onerror = () => {
      setError("The importer stopped unexpectedly. Your files were not uploaded.");
      setBusy(false);
    };
    const request: ImportWorkerRequest = { type: "import", files };
    worker.postMessage(request);
  }, [stopWorker]);

  const cancelImport = useCallback(() => {
    const request: ImportWorkerRequest = { type: "cancel" };
    workerRef.current?.postMessage(request);
  }, []);

  const loadEvents = useCallback((nextEvents: TimelineEvent[], nextReport: ImportReport) => {
    stopWorker();
    setEvents(nextEvents);
    setReport(nextReport);
    setBusy(false);
    setError("");
  }, [stopWorker]);

  const clearImport = useCallback(() => {
    stopWorker();
    setEvents([]);
    setReport(null);
    setBusy(false);
    setError("");
    setProgress("Preparing your files…");
  }, [stopWorker]);

  return { events, report, busy, progress, error, importFiles, cancelImport, loadEvents, clearImport };
}
