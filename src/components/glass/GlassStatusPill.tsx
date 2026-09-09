import type { AutomationRuntimeStatus } from "../../lib/types/automation";

type GlassStatusPillProps = {
  status: AutomationRuntimeStatus;
  label?: string;
};

const DEFAULT_LABELS: Record<AutomationRuntimeStatus, string> = {
  online: "Online",
  paused: "Paused",
  offline: "Offline",
  error: "Error",
};

export function GlassStatusPill({ status, label }: GlassStatusPillProps) {
  return (
    <span className={`glass-status-pill status-${status}`} title={label || DEFAULT_LABELS[status]}>
      <i aria-hidden="true" />
      <span>{label || DEFAULT_LABELS[status]}</span>
    </span>
  );
}
