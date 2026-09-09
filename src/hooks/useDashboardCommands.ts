import { useCallback, useState } from "react";
import type { AutomationCommand, AutomationRuntime } from "../lib/types/automation";

type UseDashboardCommandsOptions = {
  runtime: AutomationRuntime;
  executeCommand: (command: AutomationCommand) => Promise<unknown>;
};

export function useDashboardCommands({ runtime, executeCommand }: UseDashboardCommandsOptions) {
  const [busyCommand, setBusyCommand] = useState<AutomationCommand | null>(null);

  const runCommand = useCallback(async (command: AutomationCommand) => {
    setBusyCommand(command);
    try {
      return await executeCommand(command);
    } finally {
      setBusyCommand(null);
    }
  }, [executeCommand]);

  const pauseOrResume = useCallback(() => {
    return runCommand(runtime.status === "paused" ? "resume" : "pause");
  }, [runCommand, runtime.status]);

  return {
    busyCommand,
    runNow: () => runCommand("runNow"),
    startAutoRun: () => runCommand("startAutoRun"),
    stopAutoRun: () => runCommand("stopAutoRun"),
    pauseOrResume,
    sync: () => runCommand("sync"),
    emergencyStop: () => runCommand("emergencyStop"),
  };
}
