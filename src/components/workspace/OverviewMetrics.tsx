import { Activity, Gauge, ListChecks, ShieldCheck } from "lucide-react";
import type { AutomationRuntime } from "../../lib/types/automation";
import { GlassMetricCard } from "../glass/GlassMetricCard";

type OverviewMetricsProps = {
  runtime: AutomationRuntime;
};

export function OverviewMetrics({ runtime }: OverviewMetricsProps) {
  return (
    <section className="kpi-strip" aria-label="Runtime metrics">
      <GlassMetricCard label="Status" value={runtime.status} hint={runtime.simulation ? "mock mode" : "backend connected"} tone="green" />
      <GlassMetricCard label="Success" value={`${Math.round(runtime.successRate)}%`} hint="completed runs this session" tone="blue" />
      <GlassMetricCard label="Queue" value={runtime.queueDepth} hint="waiting tasks" tone="orange" />
      <GlassMetricCard label="Completed" value={Math.round(runtime.throughput)} hint="successful runs" tone="green" />
      <GlassMetricCard label="Capacity" value={`${runtime.activeRuns}/${runtime.runLimit}`} hint="active runs" tone="blue" />
      <GlassMetricCard label="Mode" value={runtime.secureMode ? "Guarded" : "Open"} hint="command policy" tone={runtime.secureMode ? "green" : "orange"} />
      <div className="kpi-icon-strip" aria-hidden="true">
        <Activity size={18} />
        <Gauge size={18} />
        <ListChecks size={18} />
        <ShieldCheck size={18} />
      </div>
    </section>
  );
}
