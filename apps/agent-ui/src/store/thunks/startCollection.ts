import { createAsyncThunk } from "@reduxjs/toolkit";
import { getLatestCollection } from "../../api/collectionApi";
import { newAbortSignal } from "../../common/AbortSignal";
import { isCollectorInProgress } from "../../common/collectorStatus";
import { parseApiError } from "../../common/parseApiError";
import { unexpectedCollectorStatusMessage } from "../../common/report/collectorMessages";
import type { SdkExtra } from "../baseQuery";
import type { CollectorStatusValue } from "../slices/collectionLifecycleSlice";

/**
 * Payload of a successful start. The previous collection is passed as primitive
 * fields (id + epoch ms) rather than a `Collection` so the fulfilled action stays
 * serializable; the listener reconstructs a `Date` when it needs one.
 */
export interface StartCollectionResult {
  previousCollectionId: string | null;
  previousCollectionCreatedAt: number | null;
  status: CollectorStatusValue;
  /** The collector reported "collected" immediately (no polling needed). */
  immediateCollected: boolean;
}

/** Rejection shape; `.unwrap()` throws this, and `parseApiError` reads `.message`. */
export interface StartCollectionError {
  message: string;
}

/**
 * Start a collector run. Kept as a thunk (not a plain action) so the modal can
 * `await dispatch(startCollection()).unwrap()` and surface start failures inline
 * (spinner + "Retry"). Once it resolves, the listener middleware takes over the
 * polling and completion handling.
 */
export const startCollection = createAsyncThunk<
  StartCollectionResult,
  void,
  { extra: SdkExtra; rejectValue: StartCollectionError }
>("collectionLifecycle/startCollection", async (_arg, thunkApi) => {
  const { agentApi } = thunkApi.extra;
  try {
    const current = await getLatestCollection(agentApi);
    const signal = newAbortSignal(
      "The server didn't respond in a timely fashion.",
    );
    const started = await agentApi.startCollector({ signal });

    if (started.status === "error") {
      return thunkApi.rejectWithValue({
        message: started.error || "The new report failed. Please try again.",
      });
    }

    const immediateCollected = started.status === "collected";
    if (!immediateCollected && !isCollectorInProgress(started.status)) {
      return thunkApi.rejectWithValue({
        message: unexpectedCollectorStatusMessage(started.status),
      });
    }

    return {
      previousCollectionId: current?.id ?? null,
      previousCollectionCreatedAt: current?.createdAt.getTime() ?? null,
      status: started.status,
      immediateCollected,
    };
  } catch (err) {
    return thunkApi.rejectWithValue({
      message: await parseApiError(
        err,
        "Failed to start a new report. Please try again.",
      ),
    });
  }
});
