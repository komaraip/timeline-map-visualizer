/// <reference lib="webworker" />

import { JSONParser } from "@streamparser/json";
import { Unzip, UnzipInflate } from "fflate";
import {
  detectSourceFormat,
  emptyImportReport,
  parserForFormat,
  type ImportReport,
  type ImportWarning,
  type TimelineEvent,
} from "@/core/timeline";
import type { ImportWorkerRequest } from "./import.types";

const MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024;
const ROOT_KEYS = ["semanticSegments", "timelineObjects", "locations"] as const;

let cancelled = false;
let decompressedBytes = 0;
let report: ImportReport;
let events: TimelineEvent[];
let seenIds: Set<string>;
let warningMap: Map<string, ImportWarning>;

const post = (message: unknown) => self.postMessage(message);

const warn = (code: ImportWarning["code"], message: string) => {
  const current = warningMap.get(code);
  warningMap.set(code, { code, message, count: (current?.count || 0) + 1 });
};

const addEvent = (event: TimelineEvent | undefined) => {
  if (!event) {
    report.skipped += 1;
    return;
  }
  if (seenIds.has(event.id)) {
    report.duplicates += 1;
    return;
  }
  seenIds.add(event.id);
  events.push(event);
  report.accepted += 1;
};

const processJsonStream = async (
  stream: ReadableStream<Uint8Array>,
  sourceName: string,
) => {
  const reader = stream.getReader();
  const buffered: Uint8Array[] = [];
  const decoder = new TextDecoder();
  let prefix = "";
  let rootKey: (typeof ROOT_KEYS)[number] | undefined;
  let consumed = 0;

  while (!rootKey) {
    if (cancelled) throw new DOMException("Import cancelled", "AbortError");
    const chunk = await reader.read();
    if (chunk.done) break;
    decompressedBytes += chunk.value.byteLength;
    consumed += chunk.value.byteLength;
    if (decompressedBytes > MAX_UNCOMPRESSED_BYTES) {
      warn("LIMIT_EXCEEDED", "The import exceeded the 1 GiB decompressed-data limit.");
      throw new Error("Import limit exceeded");
    }
    buffered.push(chunk.value);
    prefix += decoder.decode(chunk.value, { stream: true });
    rootKey = ROOT_KEYS.find((key) => new RegExp(`"${key}"\\s*:`).test(prefix));
    if (prefix.length > 1_048_576) break;
  }

  if (!rootKey) {
    if (!consumed) warn("EMPTY_FILE", "An empty JSON file was ignored.");
    else warn("UNSUPPORTED_FORMAT", "A JSON file did not contain a supported Timeline root array.");
    report.ignoredFiles += 1;
    await reader.cancel();
    return;
  }

  const format = detectSourceFormat(rootKey);
  if (!format) return;
  if (!report.formats.includes(format)) report.formats.push(format);
  const parseEntry = parserForFormat(format);
  const parser = new JSONParser({ paths: [`$.${rootKey}.*`], keepStack: false });
  let parserError: Error | undefined;
  parser.onValue = ({ value }) => {
    if (cancelled) return;
    addEvent(parseEntry(value, { sourceName, warn }));
    if (report.accepted % 2_000 === 0) {
      post({ type: "progress", accepted: report.accepted, fileName: sourceName });
    }
  };
  parser.onError = (error: Error) => { parserError = error; };

  try {
    buffered.forEach((chunk) => parser.write(chunk));
    while (true) {
      if (cancelled) throw new DOMException("Import cancelled", "AbortError");
      const chunk = await reader.read();
      if (chunk.done) break;
      decompressedBytes += chunk.value.byteLength;
      if (decompressedBytes > MAX_UNCOMPRESSED_BYTES) {
        warn("LIMIT_EXCEEDED", "The import exceeded the 1 GiB decompressed-data limit.");
        throw new Error("Import limit exceeded");
      }
      parser.write(chunk.value);
    }
    parser.end();
    if (parserError) throw parserError;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    warn("INVALID_JSON", "A malformed JSON file could not be completely parsed.");
    report.ignoredFiles += 1;
  }
};

const processZip = async (file: File) => {
  const tasks: Promise<void>[] = [];
  let unzipError: Error | undefined;
  const unzip = new Unzip((entry) => {
    if (!entry.name.toLowerCase().endsWith(".json")) {
      report.ignoredFiles += 1;
      return;
    }
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        entry.ondata = (error, chunk, final) => {
          if (error) {
            controller.error(error);
            return;
          }
          if (chunk?.byteLength) controller.enqueue(chunk);
          if (final) controller.close();
        };
        entry.start();
      },
      cancel() {
        entry.terminate();
      },
    });
    tasks.push(processJsonStream(readable, entry.name));
  });
  unzip.register(UnzipInflate);

  try {
    const reader = file.stream().getReader();
    while (true) {
      if (cancelled) throw new DOMException("Import cancelled", "AbortError");
      const chunk = await reader.read();
      if (chunk.done) break;
      unzip.push(chunk.value, false);
    }
    unzip.push(new Uint8Array(0), true);
  } catch (error) {
    unzipError = error as Error;
  }
  await Promise.all(tasks);
  if (unzipError) throw unzipError;
};

const runImport = async (files: File[]) => {
  cancelled = false;
  decompressedBytes = 0;
  report = emptyImportReport();
  events = [];
  seenIds = new Set();
  warningMap = new Map();

  try {
    for (const file of files) {
      if (cancelled) throw new DOMException("Import cancelled", "AbortError");
      post({ type: "progress", accepted: report.accepted, fileName: file.name });
      if (file.name.toLowerCase().endsWith(".zip")) await processZip(file);
      else if (file.name.toLowerCase().endsWith(".json")) await processJsonStream(file.stream(), file.name);
      else report.ignoredFiles += 1;
    }
    report.warnings = [...warningMap.values()];
    events.sort((a, b) => {
      const left = a.kind === "sample" ? a.timestampMs : a.startMs;
      const right = b.kind === "sample" ? b.timestampMs : b.startMs;
      return left - right;
    });
    post({ type: "complete", events, report });
  } catch (error) {
    if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
      post({ type: "cancelled" });
    } else {
      report.warnings = [...warningMap.values()];
      post({ type: "error", message: "The selected files could not be imported safely.", report });
    }
  }
};

self.onmessage = (message: MessageEvent<ImportWorkerRequest>) => {
  if (message.data.type === "cancel") {
    cancelled = true;
    return;
  }
  if (message.data.type === "import" && message.data.files) void runImport(message.data.files);
};
