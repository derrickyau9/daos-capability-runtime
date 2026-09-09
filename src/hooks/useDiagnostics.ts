import { useCallback, useState } from "react";
import { testEndpoint } from "../lib/api/automationApi";
import { dashboardConfig } from "../lib/dashboardConfig";

export function useDiagnostics() {
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const runEndpointTest = useCallback(async (path: string) => {
    setTesting(path);
    try {
      const result = dashboardConfig.mockMode
        ? { ok: true, mode: "mock", endpoint: path }
        : await testEndpoint(path);
      setTestResult({ endpoint: path, ...result });
      return result;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Endpoint test failed";
      const result = { endpoint: path, ok: false, error: message };
      setTestResult(result);
      return result;
    } finally {
      setTesting(null);
    }
  }, []);

  return {
    diagnostics: {
      panel: dashboardConfig.productName,
      apiBase: dashboardConfig.apiBase,
      mockMode: dashboardConfig.mockMode,
      intervalMinutes: dashboardConfig.defaultAutoIntervalMinutes,
    },
    testResult,
    testing,
    runEndpointTest,
  };
}
