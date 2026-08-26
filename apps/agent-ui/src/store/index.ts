import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import type { AgentApiClient } from "../api/agentApi";
import { agentApiSlice } from "./api/agentApiSlice";
import { appInitialized } from "./appActions";
import type { SdkExtra } from "./baseQuery";
import {
  type AppStartListening,
  createAppListenerMiddleware,
} from "./listenerMiddleware";
import { setupCollectionLifecycleListeners } from "./listeners/collectionLifecycleListeners";
import { setupVmsInvalidationListeners } from "./listeners/vmsInvalidationListeners";
import { collectionLifecycleReducer } from "./slices/collectionLifecycleSlice";

// Attach endpoint definitions to the api slice (side-effect imports).
import "./api/comparisonEndpoints";
import "./api/credentialsEndpoints";
import "./api/forecasterEndpoints";
import "./api/groupsEndpoints";
import "./api/lifecycleEndpoints";
import "./api/vmsEndpoints";

/**
 * Build the Redux store around the composed SDK client. The client is passed as
 * the thunk `extraArgument` (and the listener middleware `extra`) so the custom
 * baseQuery, thunks and listener effects all reuse the exact same SDK instance.
 */
export function createStore(agentApi: AgentApiClient) {
  const extra: SdkExtra = { agentApi };

  const listenerMiddleware = createAppListenerMiddleware(extra);
  const startAppListening =
    listenerMiddleware.startListening as AppStartListening;
  setupCollectionLifecycleListeners(startAppListening);
  setupVmsInvalidationListeners(startAppListening);

  const store = configureStore({
    reducer: {
      [agentApiSlice.reducerPath]: agentApiSlice.reducer,
      collectionLifecycle: collectionLifecycleReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: extra } })
        .prepend(listenerMiddleware.middleware)
        .concat(agentApiSlice.middleware),
  });
  setupListeners(store.dispatch);
  store.dispatch(appInitialized());
  return store;
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
