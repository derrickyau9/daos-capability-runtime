import { Activity, Bot, Clock3, Database, Gauge, ListChecks, ShieldCheck } from "lucide-react";
import type { AutomationRuntime } from "../../lib/types/automation";
import { GlassCard } from "../glass/GlassCard";

type AutomationStatusCardsProps = {
  runtime: AutomationRuntime;
};

export function AutomationStatusCards({ runtime }: AutomationStatusCardsProps) {
  return (
    <div className="automation-status-grid">
      <GlassCard title="System" value={runtime.systemName} icon={<Bot size={16} />} tone="blue" />
      <GlassCard title="Cadence" value={runtime.cadenceLabel} icon={<Clock3 size={16} />} />
      <GlassCard
        title="Auto-run"
        value={runtime.autoRun.running ? "Running" : "Idle"}
        subtitle={runtime.autoRun.nextRunAt ? `Next ${formatTime(runtime.autoRun.nextRunAt)}` : "Start a run from the controls above"}
        icon={<Activity size={16} />}
        tone={runtime.autoRun.running ? "green" : "orange"}
      />
      <GlassCard
        title="Active runs"
        value={`${runtime.activeRuns}/${runtime.runLimit}`}
        subtitle="Runs active at the same time"
        icon={<ShieldCheck size={16} />}
        tone="green"
      />
      <GlassCard title="Engine" value={runtime.engineVersion} icon={<Database size={16} />} tone="orange" />
      <GlassCard title="Last run" value={runtime.lastRunLabel} icon={<Activity size={16} />} />
      <GlassCard title="Success" value={`${Math.round(runtime.successRate)}%`} icon={<Gauge size={16} />} tone="green" />
      <GlassCard title="Successful runs" value={Math.round(runtime.throughput)} icon={<ListChecks size={16} />} tone="blue" />
      <GlassCard title="Queue" value={String(runtime.queueDepth)} icon={<ListChecks size={16} />} />
    </div>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "pending";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
