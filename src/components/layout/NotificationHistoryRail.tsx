import { CheckCircle2, Info, Radio, ShieldAlert } from "lucide-react";
import type { AutomationNotification } from "../../lib/types/automation";
import { runText } from '../../lib/runtimeText';

type NotificationHistoryRailProps = {
  notifications: AutomationNotification[];
  open: boolean;
};

const ICONS = {
  success: CheckCircle2,
  info: Radio,
  warning: ShieldAlert,
  error: Info,
};

export function NotificationHistoryRail({ notifications, open }: NotificationHistoryRailProps) {
  return (
    <aside className={`notification-history-rail ${open ? "is-open" : ""}`} aria-label="Notification history">
      <div className="notification-drawer" aria-hidden={!open}>
        <div className="notification-drawer-head">
          <div>
            <p className="eyebrow">Alerts</p>
            <h3>Notifications</h3>
          </div>
          <span>{notifications.length}</span>
        </div>

        <div className="notification-list">
          {notifications.length ? (
            notifications.map((item) => <NotificationRow key={item.id} item={item} />)
          ) : (
            <div className="notification-empty">
              <strong>No notifications</strong>
              <small>Requests for operator help will appear here.</small>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function NotificationRow({ item }: { item: AutomationNotification }) {
  const Icon = ICONS[item.type] || Radio;
  const meta = [item.category, item.target].filter(Boolean).join(" / ");
  return (
    <article className={`notification-row type-${item.type} category-${item.category}`}>
      <span className="notification-row-icon"><Icon size={15} /></span>
      <div>
        <strong>{item.title}</strong>
        <small title={item.message}>{runText('messages',item.message)}</small>
        {meta && <em>{meta}</em>}
      </div>
      <time>{formatNotificationTime(item.time)}</time>
    </article>
  );
}

function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
