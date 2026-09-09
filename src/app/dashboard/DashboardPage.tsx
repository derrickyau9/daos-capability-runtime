import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { FullScreenViewSheet } from "../../components/layout/FullScreenViewSheet";
import { PageFrame } from "../../components/layout/PageFrame";
import { SettingsPanel } from "../../components/settings/SettingsPanel";
import { IntegrationsPanel } from "../../components/workspace/IntegrationsPanel";
import { LogsPanel } from "../../components/workspace/LogsPanel";
import { OverviewMetrics } from "../../components/workspace/OverviewMetrics";
import { WorkflowPanel } from "../../components/workspace/WorkflowPanel";
import { useAutomationRuntime } from "../../hooks/useAutomationRuntime";
import { useRecentActivity } from "../../hooks/useRecentActivity";
import { dashboardConfig } from "../../lib/dashboardConfig";
import { RuntimeWorkbench } from "../../components/automation/RuntimeWorkbench";

const SHEET_EXIT_ANIMATION_MS = 320;

export function DashboardPage() {
  const runtimeState = useAutomationRuntime();
  const activities = useRecentActivity(runtimeState.logs);
  const [activeView, setActiveView] = useState("overview");
  const [sheetView, setSheetView] = useState<string | null>(null);
  const [sheetClosing, setSheetClosing] = useState(false);
  const sheetCloseTimerRef = useRef<number | null>(null);
  const [privacyMasked, setPrivacyMasked] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("daos-privacy-mask") === "on";
  });

  const viewSheetMeta = useMemo<Record<string, { eyebrow: string; title: string; subtitle: string }>>(() => ({
    automation: {
      eyebrow: "Automation",
      title: "Command Surface",
      subtitle: "Discover capabilities, replay recorded workflows, and route interventions.",
    },
    workflows: {
      eyebrow: "Workflows",
      title: "Task Queue",
      subtitle: "Real runs, ownership, progress, and business outcomes.",
    },
    integrations: {
      eyebrow: "Connectors",
      title: "Integration Health",
      subtitle: "Local agents, webhook receivers, workers, and data sources can report status here.",
    },
    logs: {
      eyebrow: "Logs",
      title: "Runtime Log",
      subtitle: "Recent command receipts and automation events.",
    },
    settings: {
      eyebrow: "Settings",
      title: "Framework Settings",
      subtitle: "Local runtime connection, privacy controls, and diagnostics.",
    },
  }), []);

  const finishSheetClose = useCallback(() => {
    if (sheetCloseTimerRef.current !== null) {
      window.clearTimeout(sheetCloseTimerRef.current);
      sheetCloseTimerRef.current = null;
    }
    setSheetClosing(false);
    setSheetView(null);
    setActiveView("overview");
  }, []);

  const closeSheet = useCallback(() => {
    if (!sheetView) {
      setActiveView("overview");
      return;
    }
    if (sheetClosing) return;
    setActiveView("overview");
    setSheetClosing(true);
    if (sheetCloseTimerRef.current !== null) {
      window.clearTimeout(sheetCloseTimerRef.current);
    }
    sheetCloseTimerRef.current = window.setTimeout(finishSheetClose, SHEET_EXIT_ANIMATION_MS);
  }, [finishSheetClose, sheetClosing, sheetView]);

  const handleViewChange = useCallback((nextView: string) => {
    if (nextView === "overview") {
      closeSheet();
      return;
    }
    if (nextView === sheetView && !sheetClosing) {
      closeSheet();
      return;
    }

    if (sheetCloseTimerRef.current !== null) {
      window.clearTimeout(sheetCloseTimerRef.current);
      sheetCloseTimerRef.current = null;
    }
    setSheetClosing(false);
    setSheetView(nextView);
    setActiveView(nextView);
  }, [closeSheet, sheetClosing, sheetView]);

  useEffect(() => {
    return () => {
      if (sheetCloseTimerRef.current !== null) {
        window.clearTimeout(sheetCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("daos-privacy-mask", privacyMasked ? "on" : "off");
  }, [privacyMasked]);

  const automationPanel = <RuntimeWorkbench />;

  const overviewPanel = (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">{dashboardConfig.productName}</p>
          <h1>{dashboardConfig.brandName}</h1>
          <span>{dashboardConfig.tagline}</span>
        </div>
        <strong className="hero-mode">{runtimeState.runtime.online ? "Connected" : "Offline"}</strong>
      </section>

      <OverviewMetrics runtime={runtimeState.runtime} />

      <RuntimeWorkbench />

      <div className="dashboard-grid">
        <WorkflowPanel tasks={runtimeState.tasks} compact />
        <IntegrationsPanel integrations={runtimeState.integrations} />
      </div>

      <div>
        <LogsPanel logs={runtimeState.logs} compact />
      </div>
    </>
  );

  const sheetContent = sheetView === "automation" ? (
    automationPanel
  ) : sheetView === "workflows" ? (
    <WorkflowPanel tasks={runtimeState.tasks} />
  ) : sheetView === "integrations" ? (
    <IntegrationsPanel integrations={runtimeState.integrations} />
  ) : sheetView === "logs" ? (
    <LogsPanel logs={runtimeState.logs} />
  ) : sheetView === "settings" ? (
    <SettingsPanel privacyMasked={privacyMasked} onTogglePrivacy={() => setPrivacyMasked((masked) => !masked)} />
  ) : null;

  const sheetMeta = sheetView ? viewSheetMeta[sheetView] : undefined;

  return (
    <AppShell
      runtime={runtimeState.runtime}
      activities={activities}
      notifications={runtimeState.notifications}
      privacyMasked={privacyMasked}
      onTogglePrivacy={() => setPrivacyMasked((masked) => !masked)}
      activeView={activeView}
      onViewChange={handleViewChange}
    >
      <PageFrame>
        {overviewPanel}
      </PageFrame>
      {sheetContent && sheetMeta && (
        <FullScreenViewSheet
          key={sheetView}
          viewKey={sheetView ?? "unknown"}
          eyebrow={sheetMeta.eyebrow}
          title={sheetMeta.title}
          subtitle={sheetMeta.subtitle}
          closing={sheetClosing}
          onClose={finishSheetClose}
        >
          {sheetContent}
        </FullScreenViewSheet>
      )}
    </AppShell>
  );
}
