import type { CollectorStatus } from "@openshift-migration-advisor/agent-sdk";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CollectorStatusValue = CollectorStatus["status"];

/**
 * Client-only UI state for the app-wide "Run a new report" flow. The collection
 * run itself (start, polling, completion detection) is driven by the listener
 * middleware in `store/listeners/collectionLifecycleListeners.ts`; this slice
 * only holds the UI state that components render, following the same split as
 * `credentialsUiSlice` (server data stays in RTK Query, UI flags live here).
 */
export interface CollectionLifecycleState {
  /** The "Run a new report" confirmation modal is open. */
  isModalOpen: boolean;
  /** A collection run is in progress (from start through completion). */
  isCollecting: boolean;
  /** Latest collector status observed during the run (drives the progress bar). */
  collectorStatus: CollectorStatusValue | null;
  /** Show the "New report ready" success alert. */
  showReadyAlert: boolean;
  /** Error message to surface as a page-level alert (null when none). */
  collectError: string | null;
}

const initialState: CollectionLifecycleState = {
  isModalOpen: false,
  isCollecting: false,
  collectorStatus: null,
  showReadyAlert: false,
  collectError: null,
};

const collectionLifecycleSlice = createSlice({
  name: "collectionLifecycle",
  initialState,
  reducers: {
    openModal: (state) => {
      // Ignore while a run is in progress — matches the former hook behavior.
      if (state.isCollecting) {
        return;
      }
      state.collectError = null;
      state.isModalOpen = true;
    },
    closeModal: (state) => {
      state.isModalOpen = false;
    },
    dismissReadyAlert: (state) => {
      state.showReadyAlert = false;
    },
    dismissCollectError: (state) => {
      state.collectError = null;
    },
    /** The collector started; the run is now in progress. */
    collectingStarted: (state, action: PayloadAction<CollectorStatusValue>) => {
      state.isCollecting = true;
      state.collectorStatus = action.payload;
      state.isModalOpen = false;
      state.showReadyAlert = false;
      state.collectError = null;
    },
    /** A new collector status was observed while polling. */
    collectorStatusChanged: (
      state,
      action: PayloadAction<CollectorStatusValue>,
    ) => {
      state.collectorStatus = action.payload;
    },
    /**
     * The run finished and a newer collection is available. This is the
     * "collection completed" event that domain listeners react to in order to
     * invalidate their caches.
     */
    collectionSucceeded: (state) => {
      state.isCollecting = false;
      state.collectorStatus = null;
      state.showReadyAlert = true;
      state.collectError = null;
    },
    /** The run failed (bad status, lost contact, or no newer collection). */
    collectionErrored: (state, action: PayloadAction<string>) => {
      state.isCollecting = false;
      state.collectorStatus = null;
      state.showReadyAlert = false;
      state.collectError = action.payload;
    },
  },
});

export const {
  openModal,
  closeModal,
  dismissReadyAlert,
  dismissCollectError,
  collectingStarted,
  collectorStatusChanged,
  collectionSucceeded,
  collectionErrored,
} = collectionLifecycleSlice.actions;

export const collectionLifecycleReducer = collectionLifecycleSlice.reducer;

/** Minimal shape needed by the selectors — avoids a type cycle with the store. */
type WithCollectionLifecycle = {
  collectionLifecycle: CollectionLifecycleState;
};

export const selectIsModalOpen = (state: WithCollectionLifecycle): boolean =>
  state.collectionLifecycle.isModalOpen;
export const selectIsCollecting = (state: WithCollectionLifecycle): boolean =>
  state.collectionLifecycle.isCollecting;
export const selectCollectorStatus = (
  state: WithCollectionLifecycle,
): CollectorStatusValue | null => state.collectionLifecycle.collectorStatus;
export const selectShowReadyAlert = (state: WithCollectionLifecycle): boolean =>
  state.collectionLifecycle.showReadyAlert;
export const selectCollectError = (
  state: WithCollectionLifecycle,
): string | null => state.collectionLifecycle.collectError;
