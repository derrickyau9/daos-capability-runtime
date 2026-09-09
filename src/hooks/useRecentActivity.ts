import { useMemo } from "react";
import type { DashboardActivity } from "../lib/types/activity";
import type { AutomationLogEntry } from "../lib/types/automation";
import { logText } from '../lib/runtimeText';

export function useRecentActivity(logs: AutomationLogEntry[]) {
  return useMemo<DashboardActivity[]>(() => {
    const activities = logs.slice(0, 6).map((log) => ({
      id: log.id,
      time: formatTime(log.time),
      type: log.type,
      title: log.source,
      subtitle: logText(log.message),
    }));

    if (activities.length) return activities;

    return [
      {
        id: "placeholder-health",
        time: "now",
        type: "success",
        title: "No runs yet",
        subtitle: "Start a run to see its progress here.",
      },
    ];
  }, [logs]);
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
