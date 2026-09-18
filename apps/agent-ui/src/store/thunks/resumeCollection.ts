import { createAsyncThunk } from "@reduxjs/toolkit";
import { getLatestCollection } from "../../api/collectionApi";
import { getCollectorStatus } from "../../api/collectorApi";
import { isCollectorInProgress } from "../../common/collectorStatus";
import type { SdkExtra } from "../baseQuery";
import type { StartCollectionResult } from "./startCollection";

/**
 * Detect a collector run already in progress at startup (e.g. the page was
 * reloaded, or the run was started elsewhere) and hand it off to the lifecycle
 * listener so polling resumes and the caches invalidate on completion. Resolves
 * to `null` when there is nothing to resume; best-effort, never rejects.
 */
export const resumeCollection = createAsyncThunk<
  StartCollectionResult | null,
  void,
  { extra: SdkExtra }
>("collectionLifecycle/resumeCollection", async (_arg, thunkApi) => {
  const { agentApi } = thunkApi.extra;
  try {
    const status = await getCollectorStatus(agentApi);
    if (!isCollectorInProgress(status.status)) {
      return null;
    }
    const current = await getLatestCollection(agentApi);
    return {
      previousCollectionId: current?.id ?? null,
      previousCollectionCreatedAt: current?.createdAt.getTime() ?? null,
      status: status.status,
      immediateCollected: false,
    };
  } catch {
    // If we can't read the collector status, there's nothing to resume.
    return null;
  }
});
