import { ExternalLink } from "lucide-react";
import type { DashboardActivity } from "../../lib/types/activity";
import { GlassButton } from "../glass/GlassButton";
import { ActivityItem } from "./ActivityItem";

type RecentActivityBarProps = {
  activities: DashboardActivity[];
  onOpenLogs: () => void;
};

export function RecentActivityBar({ activities, onOpenLogs }: RecentActivityBarProps) {
  return (
    <section className="recent-activity-bar">
      <div className="activity-header">
        <span>Recent activity</span>
        <GlassButton size="sm" variant="ghost" icon={<ExternalLink size={14} />} onClick={onOpenLogs}>
          Open logs
        </GlassButton>
      </div>
      <div className="activity-list">
        {activities.slice(0, 4).map((item) => (
          <ActivityItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
