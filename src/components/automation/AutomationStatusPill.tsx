import type { AutomationRuntime } from "../../lib/types/automation";
import { GlassStatusPill } from "../glass/GlassStatusPill";

type AutomationStatusPillProps = {
  runtime: AutomationRuntime;
};

export function AutomationStatusPill({ runtime }: AutomationStatusPillProps) {
  return (
    <div className="automation-status-inline">
      <GlassStatusPill status={runtime.status} />
      <span>{runtime.simulation ? "Simulation" : "Connected"}</span>
      <span>{runtime.secureMode ? "Guarded" : "Open"}</span>
    </div>
  );
}
