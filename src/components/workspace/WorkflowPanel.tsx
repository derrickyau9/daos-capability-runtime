import { CheckCircle2, CircleDot, Loader2, OctagonAlert } from "lucide-react";
import type { AutomationTask, AutomationTaskStatus } from "../../lib/types/automation";
import { GlassPanel } from "../glass/GlassPanel";

type WorkflowPanelProps = {
  tasks: AutomationTask[];
  compact?: boolean;
};

const STATUS_ICONS: Record<AutomationTaskStatus, typeof CircleDot> = {
  queued: CircleDot,
  running: Loader2,
  blocked: OctagonAlert,
  done: CheckCircle2,
};

export function WorkflowPanel({ tasks, compact = false }: WorkflowPanelProps) {
  return (
    <GlassPanel className={`workflow-panel ${compact ? "is-compact" : ""}`} padding="lg" glow>
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Workflows</p>
          <h2>Task queue</h2>
          <span>Live runs, control ownership, and verified outcomes.</span>
        </div>
        <strong className="panel-count">{tasks.length}</strong>
      </div>

      <div className="workflow-list">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </GlassPanel>
  );
}

function TaskRow({ task }: { task: AutomationTask }) {
  const Icon = STATUS_ICONS[task.status];
  return (
    <article className={`task-row status-${task.status}`}>
      <span className="task-status-icon"><Icon size={16} /></span>
      <div className="task-main">
        <div>
          <strong>{task.title}</strong>
          <em>{task.owner}</em>
        </div>
        <small>{task.note}</small>
        <div className="task-progress" aria-label={`${task.progress}% complete`}>
          <i style={{ width: `${Math.max(0, Math.min(100, task.progress))}%` }} />
        </div>
      </div>
      <div className="task-meta">
        <span>{task.status}</span>
        <em>{task.priority}</em>
      </div>
    </article>
  );
}
