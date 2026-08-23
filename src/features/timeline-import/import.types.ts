import type { ImportReport, TimelineEvent } from "@/core/timeline";

export type ImportWorkerRequest =
  | { type: "import"; files: File[] }
  | { type: "cancel" };

export type ImportWorkerResponse =
  | { type: "progress"; accepted: number; fileName: string }
  | { type: "complete"; events: TimelineEvent[]; report: ImportReport }
  | { type: "cancelled" }
  | { type: "error"; message: string; report: ImportReport };

export interface TimelineImportState {
  events: TimelineEvent[];
  report: ImportReport | null;
  busy: boolean;
  progress: string;
  error: string;
}
