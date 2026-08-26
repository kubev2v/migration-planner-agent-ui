import { createAction } from "@reduxjs/toolkit";

/**
 * Dispatched once, right after the store is created (see `createStore`). Listener
 * middleware uses it as an app-startup hook — e.g. resuming a collection run that
 * was already in progress when the page loaded.
 */
export const appInitialized = createAction("app/initialized");
