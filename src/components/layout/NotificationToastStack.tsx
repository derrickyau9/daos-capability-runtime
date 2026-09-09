import { BellRing } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AutomationNotification } from "../../lib/types/automation";
import { runText } from '../../lib/runtimeText';

type NotificationToastStackProps = {
  notifications: AutomationNotification[];
};

export function NotificationToastStack({ notifications }: NotificationToastStackProps) {
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const [toasts, setToasts] = useState<AutomationNotification[]>([]);

  useEffect(() => {
    if (!initialized.current) {
      notifications.forEach((item) => seenIds.current.add(item.id));
      initialized.current = true;
      return;
    }

    const fresh = notifications
      .filter((item) => !seenIds.current.has(item.id))
      .filter((item) => item.category === "workflow" || item.category === "integration" || item.type === "error")
      .slice(0, 3);

    if (!fresh.length) return;
    fresh.forEach((item) => seenIds.current.add(item.id));
    setToasts((current) => [...fresh, ...current].slice(0, 3));
  }, [notifications]);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(0, -1));
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="notification-toast-stack" aria-live="polite">
      {toasts.map((item) => (
        <article className={`notification-toast type-${item.type}`} key={item.id}>
          <span><BellRing size={16} /></span>
          <div>
            <strong>{item.title}</strong>
            <small title={item.message}>{runText('messages',item.message)}</small>
          </div>
        </article>
      ))}
    </div>
  );
}
