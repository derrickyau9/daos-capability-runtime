import { AlertTriangle, CheckCircle2, Info, Radio } from "lucide-react";
import type { DashboardActivity } from "../../lib/types/activity";

type ActivityItemProps = {
  item: DashboardActivity;
};

const ICONS = {
  success: CheckCircle2,
  info: Radio,
  warning: AlertTriangle,
  error: Info,
};

export function ActivityItem({ item }: ActivityItemProps) {
  const Icon = ICONS[item.type];
  return (
    <article className={`activity-item type-${item.type}`}>
      <span className="activity-icon"><Icon size={16} /></span>
      <div>
        <strong>{item.title}</strong>
        {item.subtitle && <small>{item.subtitle}</small>}
      </div>
      <time>{item.time}</time>
    </article>
  );
}
