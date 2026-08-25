import "@patternfly/react-core/dist/styles/base.css";

import { Spinner } from "@patternfly/react-core";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { getAgentApiClient } from "../api/agentApiClient.ts";
import { AgentUIVersion } from "../common/AgentUIVersion.tsx";
import { ReportsProvider } from "../common/report/ReportsContext.tsx";
import { createStore } from "../store/index.ts";
import { router } from "./Router.tsx";

function main(): void {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error(
      "Root element not found. Make sure the HTML contains an element with id='root'.",
    );
  }

  root.style.height = "inherit";

  const store = createStore(getAgentApiClient());
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ReduxProvider store={store}>
        <ReportsProvider>
          <React.Suspense fallback={<Spinner />}>
            <AgentUIVersion />
            <RouterProvider router={router} />
          </React.Suspense>
        </ReportsProvider>
      </ReduxProvider>
    </React.StrictMode>,
  );
}

main();
