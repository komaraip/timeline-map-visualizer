import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./TimelineMap", () => ({ TimelineMap: () => <div aria-label="Interactive map of imported timeline data" /> }));
vi.mock("@/features/journey-video", () => ({ JourneyVideoStudio: ({ onClose }: { onClose: () => void }) => <div role="dialog" aria-label="Journey Video Studio"><button type="button" onClick={onClose}>Close studio</button></div> }));

import { TimelineApp } from "./TimelineApp";

describe("TimelineApp", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
  });

  it("renders the private local-import experience", () => {
    render(<TimelineApp />);
    expect(screen.getByText("Your journeys,")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose files" })).toBeInTheDocument();
    expect(screen.getByText(/never sent to this website/i)).toBeInTheDocument();
  });

  it("opens the synthetic explorer and clears all data", () => {
    render(<TimelineApp />);
    fireEvent.click(screen.getByRole("button", { name: "Explore synthetic demo" }));
    expect(screen.getByLabelText("Interactive map of imported timeline data")).toBeInTheDocument();
    expect(screen.getByText("MAPPED DISTANCE")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Create short" })[0]);
    expect(screen.getByRole("dialog", { name: "Journey Video Studio" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear data" }));
    expect(screen.getByRole("button", { name: "Choose files" })).toBeInTheDocument();
  });
});
