import { useTimelineWorkspace } from "../hooks/use-timeline-workspace";
import { LandingPage } from "./LandingPage";
import { TimelineWorkspace } from "./TimelineWorkspace";

export function TimelineApp() {
  const workspace = useTimelineWorkspace();
  if (!workspace.events.length) {
    return <LandingPage onFiles={workspace.importFiles} onDemo={workspace.loadDemo} busy={workspace.busy} progress={workspace.progress} error={workspace.error} onCancel={workspace.cancelImport} />;
  }
  return <TimelineWorkspace workspace={workspace} />;
}
