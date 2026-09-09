import { useCallback, useEffect, useState } from 'react';
import { getAutomationSnapshot, postAutomationCommand } from '../lib/api/automationApi';
import type { AutomationCommand, AutomationRuntime, AutomationSnapshot } from '../lib/types/automation';
const emptyRuntime: AutomationRuntime = {
  online:false, status:'offline', systemName:'Capability Runtime', cadenceLabel:'On demand', activeRuns:0, runLimit:1,
  engineVersion:'1.0.0', lastRunLabel:'No runs yet', simulation:false, secureMode:true, throughput:0, queueDepth:0, successRate:0,
  autoRun: { enabled:false, running:false, intervalMinutes:0 },
};
export function useAutomationRuntime(refreshMs = 2000) {
  const [snapshot,setSnapshot] = useState<AutomationSnapshot>({});
  const [error,setError] = useState<Error|null>(null); const [loading,setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { const value = await getAutomationSnapshot(); setSnapshot(value); setError(null); return value; }
    catch(error) { setError(error instanceof Error ? error : new Error('Runtime unavailable')); return null; }
    finally { setLoading(false); }
  },[]);
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(),refreshMs); return () => clearInterval(timer); },[refresh,refreshMs]);
  const executeCommand = useCallback(async (command: AutomationCommand) => { const value = await postAutomationCommand(command); setSnapshot(value); return value; },[]);
  return { snapshot,setSnapshot,runtime:{...emptyRuntime,...snapshot.runtime,...(error ? {online:false,status:'offline' as const}: {})},
    tasks:snapshot.tasks || [],integrations:snapshot.integrations || [],logs:snapshot.logs || [],notifications:snapshot.notifications || [],
    loading,error,refresh,executeCommand };
}
