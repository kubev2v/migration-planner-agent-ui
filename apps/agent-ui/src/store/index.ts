import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import type { AgentApiClient } from "../api/agentApi";
import { agentApiSlice } from "./api/agentApiSlice";
import type { SdkExtra } from "./baseQuery";
import { appModeReducer } from "./slices/appModeSlice";
import { credentialsUiReducer } from "./slices/credentialsUiSlice";

// Attach endpoint definitions to the api slice (side-effect imports).
import "./api/credentialsEndpoints";
import "./api/groupsEndpoints";

/**
 * Build the Redux store around the composed SDK client. The client is passed as
 * the thunk `extraArgument` so the custom baseQuery (and any thunk) can reuse
 * the exact same instance registered in the IoC container.
 */
export function createStore(agentApi: AgentApiClient) {
  const extra: SdkExtra = { agentApi };
  const store = configureStore({
    reducer: {
      [agentApiSlice.reducerPath]: agentApiSlice.reducer,
      appMode: appModeReducer,
      credentialsUi: credentialsUiReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: extra } }).concat(
        agentApiSlice.middleware,
      ),
  });
  setupListeners(store.dispatch);
  return store;
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
