import {
  createListenerMiddleware,
  type TypedStartListening,
} from "@reduxjs/toolkit";
import type { SdkExtra } from "./baseQuery";
import type { AppDispatch, RootState } from "./index";

/** Typed `startListening` for the agent-ui store (state, dispatch and SDK extra). */
export type AppStartListening = TypedStartListening<
  RootState,
  AppDispatch,
  SdkExtra
>;

/**
 * Build the listener middleware for a store. Created per-store (inside
 * `createStore`) so effects can read the same SDK client via `listenerApi.extra`
 * that the RTK Query baseQuery uses.
 *
 * The instance is returned untyped against `RootState` on purpose: annotating it
 * with `AppStartListening` here would make `createStore`'s inferred return type
 * depend on `RootState` (which is itself derived from `createStore`), a circular
 * reference. Callers cast `startListening` to `AppStartListening` instead.
 */
export function createAppListenerMiddleware(extra: SdkExtra) {
  return createListenerMiddleware({ extra });
}
