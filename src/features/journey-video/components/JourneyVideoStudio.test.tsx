import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TimelineEvent } from "@/core/timeline";

class MockSource {
  setData = vi.fn();
}

class MockMap {
  private sources = new Map<string, MockSource>();
  private handlers = new Map<string, Array<() => void>>();
  private canvas = document.createElement("canvas");
  constructor() {
    this.canvas.width = 720; this.canvas.height = 1280;
    queueMicrotask(() => this.handlers.get("load")?.forEach((handler) => handler()));
  }
  on(name: string, handler: () => void) { this.handlers.set(name, [...(this.handlers.get(name) || []), handler]); }
  addSource(name: string) { this.sources.set(name, new MockSource()); }
  getSource(name: string) { return this.sources.get(name); }
  addLayer() {}
  fitBounds() {}
  jumpTo() {}
  getZoom() { return 9; }
  getCanvas() { return this.canvas; }
  project() { return { x: 360, y: 640 }; }
  remove() {}
}

vi.mock("maplibre-gl", () => ({ default: { Map: MockMap } }));

import { JourneyVideoStudio } from "./JourneyVideoStudio";

const visitOnly: TimelineEvent[] = [
  { kind: "visit", id: "visit", sourceFormat: "device-timeline", startMs: Date.UTC(2025, 0, 1), position: [106.8, -6.2], label: "Synthetic stop" },
];

describe("JourneyVideoStudio", () => {
  it("offers short formats, music choices, and the visit-only fallback", async () => {
    const onClose = vi.fn();
    render(<JourneyVideoStudio events={visitOnly} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Create a moving memory." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "9:16" })).toHaveClass("active");
    fireEvent.click(screen.getByRole("button", { name: "16:9" }));
    expect(screen.getByRole("button", { name: "16:9" })).toHaveClass("active");
    expect(screen.getByText("Ambient Drift")).toBeInTheDocument();
    expect(screen.getByText(/no mapped movement/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Synthetic stop")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Close video studio" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("reports unsupported recording without losing the preview", () => {
    render(<JourneyVideoStudio events={visitOnly} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Create video" }));
    expect(screen.getByText(/video recording is not supported/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Animated journey preview")).toBeInTheDocument();
  });
});
