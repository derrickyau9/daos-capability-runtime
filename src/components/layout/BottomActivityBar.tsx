import type { DashboardActivity } from "../../lib/types/activity";
import { RecentActivityBar } from "../activity/RecentActivityBar";

type BottomActivityBarProps = {
  activities: DashboardActivity[];
  onOpenLogs: () => void;
};

export function BottomActivityBar({ activities, onOpenLogs }: BottomActivityBarProps) {
  return (
    <footer className="bottom-activity-shell">
      <RecentActivityBar activities={activities} onOpenLogs={onOpenLogs} />
    </footer>
  );
}
