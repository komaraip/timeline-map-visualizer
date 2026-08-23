"use client";

import { useSyncExternalStore } from "react";
import { useTimelineWorkspace } from "../hooks/use-timeline-workspace";
import { LandingPage } from "./LandingPage";
import { TimelineWorkspace } from "./TimelineWorkspace";

const subscribeToHydration = () => () => undefined;
const getClientHydration = () => true;
const getServerHydration = () => false;

export function TimelineApp() {
  const workspace = useTimelineWorkspace();
  const interactive = useSyncExternalStore(subscribeToHydration, getClientHydration, getServerHydration);
  if (!workspace.events.length) {
    return <LandingPage onFiles={workspace.importFiles} onDemo={workspace.loadDemo} busy={workspace.busy} progress={workspace.progress} error={workspace.error} onCancel={workspace.cancelImport} interactive={interactive} />;
  }
  return <TimelineWorkspace workspace={workspace} />;
}
