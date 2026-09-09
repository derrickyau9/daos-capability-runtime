import type { AutomationCommand, AutomationRuntime } from "../../lib/types/automation";
import { GlassPanel } from "../glass/GlassPanel";
import { AutomationStatusCards } from "./AutomationStatusCards";
import { AutomationStatusPill } from "./AutomationStatusPill";
import { CommandGrid } from "./CommandGrid";

type AutomationPanelProps = {
  runtime: AutomationRuntime;
  busyCommand: AutomationCommand | null;
  onRunNow: () => void;
  onStartAutoRun: () => void;
  onStopAutoRun: () => void;
  onPauseResume: () => void;
  onSync: () => void;
  onEmergencyStop: () => void;
};

export function AutomationPanel({
  runtime,
  busyCommand,
  onRunNow,
  onStartAutoRun,
  onStopAutoRun,
  onPauseResume,
  onSync,
  onEmergencyStop,
}: AutomationPanelProps) {
  return (
    <GlassPanel className="automation-panel" padding="lg" intensity="strong">
      <div className="panel-title-row is-compact">
        <div>
          <p className="eyebrow">Automation</p>
          <h2>Command surface</h2>
          <span>Run, pause, sync, and stop generic automation work from one portable panel.</span>
        </div>
        <AutomationStatusPill runtime={runtime} />
      </div>

      <CommandGrid
        paused={runtime.status === "paused"}
        autoRunning={runtime.autoRun.running}
        busyCommand={busyCommand}
        onRunNow={onRunNow}
        onStartAutoRun={onStartAutoRun}
        onStopAutoRun={onStopAutoRun}
        onPauseResume={onPauseResume}
        onSync={onSync}
        onEmergencyStop={onEmergencyStop}
      />

      <AutomationStatusCards runtime={runtime} />
    </GlassPanel>
  );
}
