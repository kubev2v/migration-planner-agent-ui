import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";

/**
 * RVTools Standalone Analyzer (OpenAPI v1) has `GET /status` → `AnalyzerStatus`,
 * not the agent appliance's `GET /agent` → `AgentStatus`.
 *
 * The rest of the UI still expects {@link AgentStatus} from the SDK; we synthesize a
 * minimal compatible object when the analyzer reports ready.
 */
const ANALYZER_READY_AGENT_STATUS: AgentStatus = {
  mode: "connected",
  consoleConnection: { status: "connected" },
  rvtoolsModeEnabled: true,
};

type AnalyzerStatusJson = { status?: string };

export async function fetchAnalyzerStatusAsAgentStatus(
  basePath: string,
): Promise<AgentStatus> {
  const url = `${basePath.replace(/\/$/, "")}/status`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`GET /status failed: HTTP ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as AnalyzerStatusJson;
  if (json.status !== "ready") {
    throw new Error(`Analyzer not ready (status: ${String(json.status)})`);
  }
  return ANALYZER_READY_AGENT_STATUS;
}
