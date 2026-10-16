import { configureStore, isPlain } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import type { AgentApiClient } from "../api/agentApi";
import { agentApiSlice } from "./api/agentApiSlice";
import type { SdkExtra } from "./baseQuery";

// Attach endpoint definitions to the api slice (side-effect imports).
import "./api/comparisonEndpoints";
import "./api/lifecycleEndpoints";
import "./api/vmsEndpoints";

/**
 * The agent SDK parses OpenAPI `date-time` fields as `Date` (e.g. collection
 * `createdAt`). Those values live in the RTK Query cache, so the default
 * JSON-only serializable check has to treat `Date` as allowed.
 */
function isSerializable(value: unknown): boolean {
  return isPlain(value) || value instanceof Date;
}

/**
 * Build the Redux store around the composed SDK client. The client is passed as
 * the thunk `extraArgument` (and the listener middleware `extra`) so the custom
 * baseQuery, thunks and listener effects all reuse the exact same SDK instance.
 */
export function createStore(agentApi: AgentApiClient) {
  const extra: SdkExtra = { agentApi };

  const store = configureStore({
    reducer: {
      [agentApiSlice.reducerPath]: agentApiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
        serializableCheck: { isSerializable },
      }).concat(agentApiSlice.middleware),
  });
  setupListeners(store.dispatch);
  return store;
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
