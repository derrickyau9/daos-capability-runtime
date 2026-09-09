import { Bell, Bot, Eye, EyeOff, Home, ListChecks, PlugZap, Radio, Settings, Workflow } from "lucide-react";
import { dashboardConfig } from "../../lib/dashboardConfig";
import type { AutomationNotification, AutomationRuntime } from "../../lib/types/automation";
import { GlassStatusPill } from "../glass/GlassStatusPill";

type TopNavProps = {
  runtime: AutomationRuntime;
  activeView: string;
  notifications: AutomationNotification[];
  notificationOpen: boolean;
  privacyMasked: boolean;
  onViewChange: (view: string) => void;
  onToggleNotifications: () => void;
  onTogglePrivacy: () => void;
};

const NAV_ITEMS = [
  { value: "overview", label: "Overview", icon: Home },
  { value: "automation", label: "Automation", icon: Bot },
  { value: "workflows", label: "Workflows", icon: Workflow },
  { value: "integrations", label: "Connectors", icon: PlugZap },
  { value: "logs", label: "Logs", icon: ListChecks },
  { value: "settings", label: "Settings", icon: Settings },
] satisfies Array<{ value: string; label: string; icon: typeof Home }>;

export function TopNav({
  runtime,
  activeView,
  notifications,
  notificationOpen,
  privacyMasked,
  onViewChange,
  onToggleNotifications,
  onTogglePrivacy,
}: TopNavProps) {
  const timeLabel = new Date().toLocaleTimeString(dashboardConfig.locale, { hour: "2-digit", minute: "2-digit" });
  const noticeCount = notifications.length;

  return (
    <aside className="top-nav" aria-label="Main navigation">
      <div className="brand-lockup">
        <div>
          <strong>{dashboardConfig.brandName}</strong>
          <span>Automation</span>
        </div>
      </div>
      <div className="rail-time">{timeLabel}</div>
      <div className="top-nav-utilities" aria-label="Panel tools">
        <button
          className={`rail-tool-button ${notificationOpen ? "is-active" : ""}`}
          type="button"
          onClick={onToggleNotifications}
          title="Notifications"
          aria-label="Notifications"
          aria-pressed={notificationOpen}
        >
          <Bell size={16} />
          {noticeCount > 0 && <em>{Math.min(noticeCount, 99)}</em>}
          <span>Alerts</span>
        </button>
        <button
          className={`rail-tool-button ${privacyMasked ? "is-active" : ""}`}
          type="button"
          onClick={onTogglePrivacy}
          title={privacyMasked ? "Show diagnostic result" : "Hide diagnostic result"}
          aria-label={privacyMasked ? "Show diagnostic result" : "Hide diagnostic result"}
          aria-pressed={privacyMasked}
        >
          {privacyMasked ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{privacyMasked ? "Hidden" : "Visible"}</span>
        </button>
      </div>
      <nav className="top-nav-links">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              data-view={item.value}
              className={activeView === item.value ? "is-active" : ""}
              onClick={() => onViewChange(item.value)}
              title={item.label}
              aria-current={activeView === item.value ? "page" : undefined}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="top-nav-status">
        <GlassStatusPill status={runtime.status} />
        <span className="local-pill" title="Local session"><Radio size={14} /><span>Local</span></span>
      </div>
    </aside>
  );
}
