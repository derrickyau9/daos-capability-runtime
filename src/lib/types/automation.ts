export type AutomationRuntimeStatus = "online" | "paused" | "offline" | "error";

export type AutomationRuntime = {
  online: boolean;
  status: AutomationRuntimeStatus;
  systemName: string;
  cadenceLabel: string;
  activeRuns: number;
  runLimit: number;
  engineVersion: string;
  lastRunLabel: string;
  simulation: boolean;
  secureMode: boolean;
  throughput: number;
  queueDepth: number;
  successRate: number;
  autoRun: AutoRunStatus;
};

export type AutoRunStatus = {
  enabled: boolean;
  running: boolean;
  intervalMinutes: number;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  lastError?: string | null;
};

export type AutomationTaskStatus = "queued" | "running" | "blocked" | "done";

export type AutomationTask = {
  id: string;
  title: string;
  owner: string;
  status: AutomationTaskStatus;
  resultStatus?: "success" | "business_outcome" | "failure";
  priority: "low" | "normal" | "high";
  progress: number;
  updatedAt: string;
  note: string;
};

export type AutomationIntegration = {
  id: string;
  name: string;
  status: "connected" | "degraded" | "offline";
  scope: string;
  latencyMs: number;
  lastSeenAt: string;
};

export type AutomationLogEntry = {
  id: string;
  time: string;
  type: "success" | "info" | "warning" | "error";
  source: string;
  message: string;
};

export type AutomationNotification = {
  id: string;
  time: string;
  type: "success" | "info" | "warning" | "error";
  category: "system" | "workflow" | "integration" | "security" | string;
  source: "manual" | "auto" | "panel" | string;
  title: string;
  message: string;
  target?: string | null;
};

export type AutomationSnapshot = {
  runtime?: Partial<AutomationRuntime>;
  autoRun?: Partial<AutoRunStatus>;
  tasks?: AutomationTask[];
  integrations?: AutomationIntegration[];
  logs?: AutomationLogEntry[];
  notifications?: AutomationNotification[];
};

export type AutomationCommand =
  | "runNow"
  | "startAutoRun"
  | "stopAutoRun"
  | "pause"
  | "resume"
  | "sync"
  | "emergencyStop";
