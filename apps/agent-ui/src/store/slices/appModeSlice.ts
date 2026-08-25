import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Application mode. The three-way value does not map to a single SDK enum:
 * `AgentStatus.mode` is only `connected`/`disconnected`, and RVTools is a
 * separate `rvtoolsModeEnabled` boolean. This slice reconciles them into one
 * client-state value and establishes the slice pattern for future mode-based
 * branching (navigation, login/collection flow, RVTools collector path).
 */
export type AppMode = "connected" | "disconnected" | "rvtool";

export interface AppModeState {
  mode: AppMode;
}

const initialState: AppModeState = { mode: "disconnected" };

const appModeSlice = createSlice({
  name: "appMode",
  initialState,
  reducers: {
    setAppMode: (state, action: PayloadAction<AppMode>) => {
      state.mode = action.payload;
    },
  },
});

export const { setAppMode } = appModeSlice.actions;
export const appModeReducer = appModeSlice.reducer;

/** Selects the current three-way application mode from client state. */
export const selectAppMode = (state: { appMode: AppModeState }): AppMode =>
  state.appMode.mode;
