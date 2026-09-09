import { ScrollText } from "lucide-react";
import type { AutomationLogEntry } from "../../lib/types/automation";
import { GlassPanel } from "../glass/GlassPanel";
import { logText } from '../../lib/runtimeText';

type LogsPanelProps = {
  logs: AutomationLogEntry[];
  compact?: boolean;
};

export function LogsPanel({ logs, compact = false }: LogsPanelProps) {
  return (
    <GlassPanel className={`logs-panel ${compact ? "is-compact" : ""}`} padding="lg">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Logs</p>
          <h2>Run log</h2>
          <span>Actions and checkpoints, in the order they happened.</span>
        </div>
        <ScrollText size={20} />
      </div>

      <div className="log-list">
        {logs.slice().reverse().map((log) => (
          <article className={`log-row type-${log.type}`} key={log.id}>
            <time>{formatLogTime(log.time)}</time>
            <strong>{log.source}</strong>
            <span title={log.message}>{logText(log.message)}</span>
          </article>
        ))}
      </div>
    </GlassPanel>
  );
}

function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
