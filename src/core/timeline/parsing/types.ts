import type { SourceFormat, TimelineEvent } from "../model/types";

export interface ImportWarning {
  code: "INVALID_JSON" | "INVALID_TIMESTAMP" | "INVALID_COORDINATE" | "UNSUPPORTED_FORMAT" | "EMPTY_FILE" | "LIMIT_EXCEEDED";
  message: string;
  count: number;
}

export interface ImportReport {
  formats: SourceFormat[];
  accepted: number;
  skipped: number;
  duplicates: number;
  ignoredFiles: number;
  warnings: ImportWarning[];
}

export interface ParserContext {
  sourceName: string;
  warn: (code: ImportWarning["code"], message: string) => void;
}

export interface ParserMetadata {
  rootKey: string;
  sourceName: string;
}

export interface TimelineParser {
  format: SourceFormat;
  canParse: (metadata: ParserMetadata) => boolean;
  parse: (stream: ReadableStream<Uint8Array>, context: ParserContext) => AsyncIterable<TimelineEvent[]>;
}

export const emptyImportReport = (): ImportReport => ({
  formats: [], accepted: 0, skipped: 0, duplicates: 0, ignoredFiles: 0, warnings: [],
});
