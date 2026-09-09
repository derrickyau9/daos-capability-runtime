import { Cable, CheckCircle2, Radio, TriangleAlert } from "lucide-react";
import type { AutomationIntegration } from "../../lib/types/automation";
import { GlassPanel } from "../glass/GlassPanel";

type IntegrationsPanelProps = {
  integrations: AutomationIntegration[];
};

export function IntegrationsPanel({ integrations }: IntegrationsPanelProps) {
  return (
    <GlassPanel className="integrations-panel" padding="lg">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Connectors</p>
          <h2>Configured application</h2>
          <span>The local application used for discovery and replay.</span>
        </div>
        <Cable size={20} />
      </div>

      <div className="integration-grid">
        {integrations.map((item) => (
          <article className={`integration-row status-${item.status}`} key={item.id}>
            <span className="integration-icon">{iconForStatus(item.status)}</span>
            <div>
              <strong>{item.name}</strong>
              <small>{item.scope}</small>
            </div>
            <em>Local</em>
          </article>
        ))}
      </div>
    </GlassPanel>
  );
}

function iconForStatus(status: AutomationIntegration["status"]) {
  if (status === "connected") return <CheckCircle2 size={16} />;
  if (status === "degraded") return <TriangleAlert size={16} />;
  return <Radio size={16} />;
}
