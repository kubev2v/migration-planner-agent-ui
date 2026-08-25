import { ResponseError } from "@openshift-migration-advisor/agent-sdk";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { AgentApiClient } from "../api/agentApi";

/**
 * A baseQuery arg is a callback that performs the request using the composed
 * SDK client. This lets RTK Query reuse the existing SDK (auth, base path,
 * `cache: "no-store"`) and the raw-fetch inventory workaround, instead of
 * `fetchBaseQuery` over URLs.
 */
export type SdkQueryArg<T> = (sdk: AgentApiClient) => Promise<T>;

/** Error shape surfaced to RTK Query consumers. */
export interface SdkQueryError {
  status?: number;
  message: string;
}

/** The SDK client injected into the store via thunk `extraArgument`. */
export interface SdkExtra {
  agentApi: AgentApiClient;
}

/**
 * Custom baseQuery that executes SDK-method callbacks. The client is read from
 * the thunk `extraArgument` (see `createStore`), so there is a single client
 * instance shared with the IoC container and it is trivial to inject a fake in
 * tests.
 */
export const sdkBaseQuery =
  (): BaseQueryFn<SdkQueryArg<unknown>, unknown, SdkQueryError> =>
  async (fn, api) => {
    const { agentApi } = api.extra as SdkExtra;
    try {
      const data = await fn(agentApi);
      return { data };
    } catch (err) {
      if (err instanceof ResponseError) {
        return {
          error: { status: err.response?.status, message: err.message },
        };
      }
      return {
        error: {
          message: err instanceof Error ? err.message : "Request failed",
        },
      };
    }
  };
