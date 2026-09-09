import type { AutomationRuntime } from "../../lib/types/automation";
import { GlassMetricCard } from "../glass/GlassMetricCard";

type OverviewMetricsProps = {
  runtime: AutomationRuntime;
};

export function OverviewMetrics({ runtime }: OverviewMetricsProps) {
  return (
    <section className="kpi-strip" aria-label="Runtime metrics">
      <GlassMetricCard label="Status" value={runtime.status} hint={runtime.simulation ? "mock mode" : "backend connected"} tone="green" />
      <GlassMetricCard label="Success rate" value={`${Math.round(runtime.successRate)}%`} hint="of finished runs" tone="blue" />
      <GlassMetricCard label="Runs start" value="On demand" hint="started from the panel or CLI" tone="orange" />
      <GlassMetricCard label="Completed" value={Math.round(runtime.throughput)} hint="successful runs" tone="green" />
      <GlassMetricCard label="Capacity" value={`${runtime.activeRuns}/${runtime.runLimit}`} hint="active runs" tone="blue" />
      <GlassMetricCard label="Policy" value={runtime.secureMode ? "Enabled" : "Disabled"} hint="account submission blocked" tone={runtime.secureMode ? "green" : "orange"} />
    </section>
  );
}
