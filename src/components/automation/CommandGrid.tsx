import { Pause, PlayCircle, RefreshCw, ShieldAlert, Square, Waves } from "lucide-react";
import type { AutomationCommand } from "../../lib/types/automation";
import { CommandButton } from "./CommandButton";

type CommandGridProps = {
  paused: boolean;
  autoRunning: boolean;
  busyCommand: AutomationCommand | null;
  onRunNow: () => void;
  onStartAutoRun: () => void;
  onStopAutoRun: () => void;
  onPauseResume: () => void;
  onSync: () => void;
  onEmergencyStop: () => void;
};

export function CommandGrid({
  paused,
  autoRunning,
  busyCommand,
  onRunNow,
  onStartAutoRun,
  onStopAutoRun,
  onPauseResume,
  onSync,
  onEmergencyStop,
}: CommandGridProps) {
  return (
    <div className="command-grid">
      <CommandButton
        label={autoRunning ? "Stop auto-run" : "Start auto-run"}
        variant={autoRunning ? "danger" : "success"}
        icon={autoRunning ? <Square size={17} /> : <PlayCircle size={17} />}
        loading={busyCommand === "startAutoRun" || busyCommand === "stopAutoRun"}
        onClick={autoRunning ? onStopAutoRun : onStartAutoRun}
      />
      <CommandButton
        label="Run now"
        variant="blue"
        icon={<RefreshCw size={17} />}
        loading={busyCommand === "runNow"}
        onClick={onRunNow}
      />
      <CommandButton
        label={paused ? "Resume" : "Pause"}
        variant="ghost"
        icon={<Pause size={17} />}
        loading={busyCommand === "pause" || busyCommand === "resume"}
        onClick={onPauseResume}
      />
      <CommandButton
        label="Sync sources"
        variant="blue"
        icon={<Waves size={17} />}
        loading={busyCommand === "sync"}
        onClick={onSync}
      />
      <CommandButton
        label="Stop all"
        variant="danger"
        icon={<ShieldAlert size={17} />}
        loading={busyCommand === "emergencyStop"}
        onClick={onEmergencyStop}
      />
    </div>
  );
}
