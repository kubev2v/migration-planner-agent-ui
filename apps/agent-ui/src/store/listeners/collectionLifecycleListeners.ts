import type { Collection } from "@openshift-migration-advisor/agent-sdk";
import { type ListenerEffectAPI, TaskAbortError } from "@reduxjs/toolkit";
import { waitForNewerCollection } from "../../api/collectionApi";
import { getCollectorStatus } from "../../api/collectorApi";
import { isCollectorInProgress } from "../../common/collectorStatus";
import { parseApiError } from "../../common/parseApiError";
import {
  COLLECTION_WAIT_INTERVAL_MS,
  COLLECTION_WAIT_TIMEOUT_MS,
  COLLECTOR_POLL_INTERVAL_MS,
  MAX_COLLECTOR_POLL_FAILURES,
  unexpectedCollectorStatusMessage,
} from "../../common/report/collectorMessages";
import type { SdkExtra } from "../baseQuery";
import type { AppDispatch, RootState } from "../index";
import type { AppStartListening } from "../listenerMiddleware";
import {
  collectingStarted,
  collectionErrored,
  collectionSucceeded,
  collectorStatusChanged,
} from "../slices/collectionLifecycleSlice";
import { startCollection } from "../thunks/startCollection";

type PreviousCollection = Pick<Collection, "id" | "createdAt"> | null;
type AppListenerApi = ListenerEffectAPI<RootState, AppDispatch, SdkExtra>;

/**
 * After the collector reports "collected", wait for a newer collection to
 * actually appear before declaring success — the report is only usable once the
 * new collection is queryable. Never throws: failures become `collectionErrored`.
 */
async function settleNewReport(
  listenerApi: AppListenerApi,
  previous: PreviousCollection,
): Promise<void> {
  const { agentApi } = listenerApi.extra;
  listenerApi.dispatch(collectorStatusChanged("collected"));

  try {
    const { foundNewer } = await waitForNewerCollection(agentApi, previous, {
      timeoutMs: COLLECTION_WAIT_TIMEOUT_MS,
      intervalMs: COLLECTION_WAIT_INTERVAL_MS,
    });
    if (listenerApi.signal.aborted) {
      return;
    }
    if (!foundNewer) {
      listenerApi.dispatch(
        collectionErrored(
          "The new report finished, but the updated collection is not available yet. Please try refreshing the page in a moment.",
        ),
      );
      return;
    }
    listenerApi.dispatch(collectionSucceeded());
  } catch (err) {
    if (listenerApi.signal.aborted) {
      return;
    }
    listenerApi.dispatch(
      collectionErrored(
        await parseApiError(
          err,
          "The new report finished, but refreshing the page failed.",
        ),
      ),
    );
  }
}

/**
 * Poll the collector status until the run reaches a terminal state, then settle.
 * Cancellation (a superseding run) surfaces as `TaskAbortError` from
 * `listenerApi.delay`; the caller swallows it.
 */
async function runCollectionToCompletion(
  listenerApi: AppListenerApi,
  previous: PreviousCollection,
  immediateCollected: boolean,
): Promise<void> {
  const { agentApi } = listenerApi.extra;

  if (immediateCollected) {
    await settleNewReport(listenerApi, previous);
    return;
  }

  let failures = 0;
  for (;;) {
    try {
      const next = await getCollectorStatus(agentApi);
      failures = 0;
      if (listenerApi.signal.aborted) {
        return;
      }
      listenerApi.dispatch(collectorStatusChanged(next.status));

      if (!isCollectorInProgress(next.status)) {
        if (next.status === "collected") {
          await settleNewReport(listenerApi, previous);
        } else if (next.status === "error") {
          listenerApi.dispatch(
            collectionErrored(
              next.error || "The new report failed. Please try again.",
            ),
          );
        } else {
          listenerApi.dispatch(
            collectionErrored(unexpectedCollectorStatusMessage(next.status)),
          );
        }
        return;
      }
    } catch (err) {
      failures += 1;
      if (failures >= MAX_COLLECTOR_POLL_FAILURES) {
        listenerApi.dispatch(
          collectionErrored(
            await parseApiError(
              err,
              "Lost contact with the collector while running a new report.",
            ),
          ),
        );
        return;
      }
    }

    // Throws TaskAbortError when a newer run cancels this one.
    await listenerApi.delay(COLLECTOR_POLL_INTERVAL_MS);
  }
}

/**
 * Wire up the collection-run lifecycle: a user-triggered start
 * (`startCollection.fulfilled`) drives polling to completion.
 */
export function setupCollectionLifecycleListeners(
  startAppListening: AppStartListening,
): void {
  startAppListening({
    actionCreator: startCollection.fulfilled,
    effect: async (action, listenerApi) => {
      // Only one run may drive the lifecycle at a time.
      listenerApi.cancelActiveListeners();

      const {
        previousCollectionId,
        previousCollectionCreatedAt,
        status,
        immediateCollected,
      } = action.payload;
      const previous: PreviousCollection =
        previousCollectionId != null && previousCollectionCreatedAt != null
          ? {
              id: previousCollectionId,
              createdAt: new Date(previousCollectionCreatedAt),
            }
          : null;

      listenerApi.dispatch(collectingStarted(status));

      try {
        await runCollectionToCompletion(
          listenerApi,
          previous,
          immediateCollected,
        );
      } catch (err) {
        if (err instanceof TaskAbortError) {
          return;
        }
        throw err;
      }
    },
  });
}
