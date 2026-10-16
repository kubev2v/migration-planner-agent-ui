import "@patternfly/react-core/dist/styles/base.css";

import { Spinner } from "@patternfly/react-core";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { getAgentApiClient } from "../api/agentApiClient.ts";
import { createStore } from "../store/index.ts";
import { AppBootstrap } from "./AppBootstrap.tsx";
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
        <AppBootstrap>
          <React.Suspense fallback={<Spinner />}>
            <RouterProvider router={router} />
          </React.Suspense>
        </AppBootstrap>
      </ReduxProvider>
    </React.StrictMode>,
  );
}

main();
