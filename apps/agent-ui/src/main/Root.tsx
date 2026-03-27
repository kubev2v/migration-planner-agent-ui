import "@patternfly/react-core/dist/styles/base.css";

import {
  Container,
  Provider as DependencyInjectionProvider,
} from "@migration-planner-ui/ioc";
import {
  Configuration,
  DefaultApi,
} from "@openshift-migration-advisor/agent-sdk";
import { Spinner } from "@patternfly/react-core";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AgentStatusProvider } from "../common/AgentStatusContext.tsx";
import { AgentUIVersion } from "../common/AgentUIVersion.tsx";
import { router } from "./Router.tsx";
import { Symbols } from "./Symbols.ts";

export const getConfigurationBasePath = (): string => {
  if (import.meta.env.PROD) {
    // In production, use HTTPS
    const origin = window.location.origin.replace(/^http:/, "https:");
    return `${origin}/api/v1`;
  }

  // In development, use the current origin (allows HTTP for local dev)
  return `${window.location.origin}/agent/api/v1`;
};

function getConfiguredContainer(): Container {
  const agentApiConfig = new Configuration({
    basePath: getConfigurationBasePath(),
  });
  const container = new Container();
  container.register(Symbols.AgentApi, new DefaultApi(agentApiConfig));

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
          <React.Suspense fallback={<Spinner />}>
            <AgentUIVersion />
            <RouterProvider router={router} />
          </React.Suspense>
        </AgentStatusProvider>
      </DependencyInjectionProvider>
    </React.StrictMode>,
  );
}

main();
