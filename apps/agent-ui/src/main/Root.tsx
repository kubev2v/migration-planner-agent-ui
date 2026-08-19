import "@patternfly/react-core/dist/styles/base.css";

import { Configuration } from "@openshift-migration-advisor/agent-sdk";
import {
  Container,
  Provider as DependencyInjectionProvider,
} from "@openshift-migration-advisor/ioc";
import { Spinner } from "@patternfly/react-core";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { createAgentApi } from "../api/agentApi.ts";
import { AgentStatusProvider } from "../common/AgentStatusContext.tsx";
import { AgentUIVersion } from "../common/AgentUIVersion.tsx";
import { ReportsProvider } from "../common/report/ReportsContext.tsx";
import { CredentialsProvider } from "../credentials/CredentialsContext.tsx";
import { router } from "./Router.tsx";
import { Symbols } from "./Symbols.ts";

export const getConfigurationBasePath = (): string => {
  if (import.meta.env.PROD) {
    // In production, use HTTPS
    const origin = window.location.origin.replace(/^http:/, "https:");
    return `${origin}/api/v2`;
  }

  // In development, use the current origin (allows HTTP for local dev)
  return `${window.location.origin}/agent/api/v2`;
};

function getConfiguredContainer(): Container {
  const agentApiConfig = new Configuration({
    basePath: getConfigurationBasePath(),
    fetchApi: (url, init) => fetch(url, { ...init, cache: "no-store" }),
  });
  const container = new Container();
  container.register(Symbols.AgentApi, createAgentApi(agentApiConfig));

  return container;
}

function main(): void {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error(
      "Root element not found. Make sure the HTML contains an element with id='root'.",
    );
  }

  root.style.height = "inherit";
  const container = getConfiguredContainer();
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <DependencyInjectionProvider container={container}>
        <AgentStatusProvider>
          <CredentialsProvider>
            <ReportsProvider>
              <React.Suspense fallback={<Spinner />}>
                <AgentUIVersion />
                <RouterProvider router={router} />
              </React.Suspense>
            </ReportsProvider>
          </CredentialsProvider>
        </AgentStatusProvider>
      </DependencyInjectionProvider>
    </React.StrictMode>,
  );
}

main();
