import { dashboardConfig } from "../dashboardConfig";
import type { AutomationCommand, AutomationSnapshot } from "../types/automation";

const COMMAND_PATHS: Record<AutomationCommand, string> = {
  runNow: "/run",
  startAutoRun: "/auto/start",
  stopAutoRun: "/auto/stop",
  pause: "/pause",
  resume: "/resume",
  sync: "/sync",
  emergencyStop: "/stop",
};

export async function getAutomationSnapshot(): Promise<AutomationSnapshot> {
  return fetchJson<AutomationSnapshot>(`${dashboardConfig.apiBase}/snapshot`);
}

export async function postAutomationCommand(command: AutomationCommand): Promise<AutomationSnapshot> {
  return fetchJson<AutomationSnapshot>(`${dashboardConfig.apiBase}${COMMAND_PATHS[command]}`, {
    method: "POST",
  });
}

export async function testEndpoint(path: string): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(path);
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }

  return response.json() as Promise<T>;
}
