import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { DashboardActivity } from "../../lib/types/activity";
import type { AutomationNotification, AutomationRuntime } from "../../lib/types/automation";
import { BottomActivityBar } from "./BottomActivityBar";
import { NotificationHistoryRail } from "./NotificationHistoryRail";
import { NotificationToastStack } from "./NotificationToastStack";
import { TopNav } from "./TopNav";

type AppShellProps = {
  children: ReactNode;
  runtime: AutomationRuntime;
  activities: DashboardActivity[];
  notifications: AutomationNotification[];
  privacyMasked: boolean;
  onTogglePrivacy: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
};

export function AppShell({
  children,
  runtime,
  activities,
  notifications,
  privacyMasked,
  onTogglePrivacy,
  activeView,
  onViewChange,
}: AppShellProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("daos-low-power");
    return () => document.body.classList.remove("daos-low-power");
  }, []);

  return (
    <div className={`daos-shell is-low-power ${privacyMasked ? "is-privacy-masked" : ""}`}>
      <TopNav
        runtime={runtime}
        activeView={activeView}
        notifications={notifications}
        notificationOpen={notificationsOpen}
        privacyMasked={privacyMasked}
        onViewChange={onViewChange}
        onToggleNotifications={() => setNotificationsOpen((open) => !open)}
        onTogglePrivacy={onTogglePrivacy}
      />
      <NotificationHistoryRail notifications={notifications} open={notificationsOpen} />
      <NotificationToastStack notifications={notifications} />
      <main className="daos-main">{children}</main>
      <BottomActivityBar activities={activities} onOpenLogs={() => onViewChange("logs")} />
    </div>
  );
}
