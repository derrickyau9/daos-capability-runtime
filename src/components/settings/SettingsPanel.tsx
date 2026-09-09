import { Database, Globe2, PlugZap, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { useDiagnostics } from "../../hooks/useDiagnostics";
import { dashboardConfig } from "../../lib/dashboardConfig";
import { GlassButton } from "../glass/GlassButton";
import { GlassCard } from "../glass/GlassCard";
import { GlassPanel } from "../glass/GlassPanel";

const ENDPOINTS = [
  { label: "Snapshot", path: `${dashboardConfig.apiBase}/snapshot` },
  { label: "Run history", path: `${dashboardConfig.apiBase}/runs` },
];

type SettingsPanelProps = {
  privacyMasked: boolean;
  onTogglePrivacy: () => void;
};

export function SettingsPanel({ privacyMasked, onTogglePrivacy }: SettingsPanelProps) {
  const diagnostics = useDiagnostics();
  const endpointItems = useMemo(() => ENDPOINTS, []);

  return (
    <GlassPanel padding="lg" className="settings-panel">
      <div className="panel-title-row is-compact">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Runtime settings</h2>
          <span>Connected to the local capability runtime. All training records are synthetic.</span>
        </div>
      </div>

      <section className="settings-control-strip">
        <GlassCard title="Locale" value={dashboardConfig.locale} icon={<Globe2 size={16} />} tone="blue" />
        <GlassCard
          title="Panel privacy mask"
          value={privacyMasked ? "******" : "Visible"}
          subtitle={privacyMasked ? "Click to show" : "Click to mask"}
          icon={<ShieldCheck size={16} />}
          tone={privacyMasked ? "green" : "orange"}
        >
          <GlassButton size="sm" variant="ghost" onClick={onTogglePrivacy}>
            {privacyMasked ? "Show" : "Mask"}
          </GlassButton>
        </GlassCard>
        <GlassCard title="Mode" value={dashboardConfig.mockMode ? "Mock" : "Connected"} icon={<SlidersHorizontal size={16} />} tone="green" />
      </section>

      <section className="settings-diagnostics-grid">
        <DiagnosticsCard title="Panel" icon={<SlidersHorizontal size={16} />} data={diagnostics.diagnostics} />
        <DiagnosticsCard title="API" icon={<PlugZap size={16} />} data={{ base: dashboardConfig.apiBase, mockMode: dashboardConfig.mockMode }} />
        <DiagnosticsCard title="Runtime" icon={<Database size={16} />} data={{ mode: "on demand", workerLimit: 1, outputPersistence: "redacted" }} />
      </section>

      <section className="settings-endpoint-lab">
        <div className="panel-title-row is-compact">
          <div>
            <p className="eyebrow">API</p>
            <h3>Endpoint lab</h3>
            <span>Read-only checks against the connected backend.</span>
          </div>
        </div>
        <div className="endpoint-grid">
          {endpointItems.map((endpoint) => (
            <button
              className="endpoint-test-button"
              type="button"
              key={endpoint.path}
              onClick={() => void diagnostics.runEndpointTest(endpoint.path)}
            >
              <strong>{endpoint.label}</strong>
              <span>{endpoint.path}</span>
              <em>{diagnostics.testing === endpoint.path ? "..." : "Test"}</em>
            </button>
          ))}
        </div>
        <div className="settings-json-block">
          <div>
            <strong>Result</strong>
            {diagnostics.testResult && <small>{String(diagnostics.testResult.endpoint || "")}</small>}
          </div>
          <pre className="privacy-sensitive" data-mask="******">{stringifySafe(diagnostics.testResult || diagnostics.diagnostics || {})}</pre>
        </div>
      </section>
    </GlassPanel>
  );
}

function DiagnosticsCard({ title, icon, data }: { title: string; icon: React.ReactNode; data: Record<string, unknown> }) {
  return (
    <article className="diagnostics-card">
      <div className="glass-card-head">
        <span className="glass-card-icon">{icon}</span>
        <span>{title}</span>
      </div>
      <pre>{stringifySafe(data)}</pre>
    </article>
  );
}

function stringifySafe(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
