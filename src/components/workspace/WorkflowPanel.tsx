import { CheckCircle2, CircleDot, Loader2, OctagonAlert } from "lucide-react";
import type { AutomationTask, AutomationTaskStatus } from "../../lib/types/automation";
import { GlassPanel } from "../glass/GlassPanel";
import { runText } from '../../lib/runtimeText';

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
          <h2>Run history</h2>
          <span>Recent runs and their results.</span>
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
  const Icon = task.resultStatus === 'failure' ? OctagonAlert : task.resultStatus === 'business_outcome' ? CircleDot : STATUS_ICONS[task.status];
  return (
    <article className={`task-row status-${task.status} result-${task.resultStatus || 'pending'}`}>
      <span className="task-status-icon"><Icon size={16} /></span>
      <div className="task-main">
        <div>
          <strong>{task.title}</strong>
          <em>{runText('owners',task.owner)}</em>
        </div>
        <small title={task.note}>{runText('messages',task.note)}</small>
        <div className="task-progress" aria-label={`${task.progress}% complete`}>
          <i style={{ width: `${Math.max(0, Math.min(100, task.progress))}%` }} />
        </div>
      </div>
      <div className="task-meta">
        <span>{runText('statuses',task.resultStatus || task.status)}</span>
        {task.priority === 'high' && <em>Needs review</em>}
      </div>
    </article>
  );
}
