import { describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { createStore } from "../index";
import { credentialsEndpoints } from "./credentialsEndpoints";

/**
 * Fake SDK whose credential validity tracks a mutable `state`, so a test can
 * change credentials and assert the queries refetch fresh data off a single
 * `Credentials` invalidation.
 */
function makeFakeApi(state: { valid: boolean }): AgentApiClient {
  return {
    getCredentials: vi.fn(async () => ({
      url: "https://vcenter.example.com/sdk",
      username: "admin@vsphere.local",
      valid: state.valid,
    })),
    getCredentialCapabilities: vi.fn(async () => ({
      capabilities: {
        collector: { enabled: state.valid },
        inspector: { enabled: state.valid },
        forecaster: { enabled: state.valid },
      },
    })),
    putCredentials: vi.fn(async () => {
      state.valid = true;
      return {
        url: "https://vcenter.example.com/sdk",
        username: "admin@vsphere.local",
        valid: true,
      };
    }),
    deleteCredentials: vi.fn(async () => undefined),
  } as unknown as AgentApiClient;
}

describe("credentialsEndpoints tag invalidation", () => {
  test("putCredentials invalidates Credentials so getCredentials refetches", async () => {
    const state = { valid: false };
    const api = makeFakeApi(state);
    const store = createStore(api);

    // Initial load sees invalid credentials.
    await store.dispatch(
      credentialsEndpoints.endpoints.getCredentials.initiate(),
    );
    const valid = () =>
      credentialsEndpoints.endpoints.getCredentials.select()(store.getState())
        .data?.valid;
    expect(valid()).toBe(false);
    expect(api.getCredentials).toHaveBeenCalledTimes(1);

    // Putting credentials invalidates Credentials -> getCredentials refetches
    // and now reflects the valid connection.
    await store
      .dispatch(
        credentialsEndpoints.endpoints.putCredentials.initiate({
          vcenterCredentials: {
            url: "https://vcenter.example.com/sdk",
            username: "admin@vsphere.local",
            password: "secret",
          },
        }),
      )
      .unwrap();

    await vi.waitFor(() => {
      expect(api.getCredentials).toHaveBeenCalledTimes(2);
      expect(valid()).toBe(true);
    });
  });

  test("putCredentials also refetches capabilities from the same invalidation", async () => {
    const state = { valid: false };
    const api = makeFakeApi(state);
    const store = createStore(api);

    await store.dispatch(
      credentialsEndpoints.endpoints.getCredentialCapabilities.initiate(),
    );
    expect(api.getCredentialCapabilities).toHaveBeenCalledTimes(1);

    await store
      .dispatch(
        credentialsEndpoints.endpoints.putCredentials.initiate({
          vcenterCredentials: {
            url: "https://vcenter.example.com/sdk",
            username: "admin@vsphere.local",
            password: "secret",
          },
        }),
      )
      .unwrap();

    // Credentials and capabilities share one tag, so they cannot diverge.
    await vi.waitFor(() => {
      expect(api.getCredentialCapabilities).toHaveBeenCalledTimes(2);
    });
  });

  test("deleteCredentials invalidates Credentials so getCredentials refetches", async () => {
    const state = { valid: true };
    const api = makeFakeApi(state);
    const store = createStore(api);

    await store.dispatch(
      credentialsEndpoints.endpoints.getCredentials.initiate(),
    );
    expect(api.getCredentials).toHaveBeenCalledTimes(1);

    await store
      .dispatch(credentialsEndpoints.endpoints.deleteCredentials.initiate())
      .unwrap();

    await vi.waitFor(() => {
      expect(api.getCredentials).toHaveBeenCalledTimes(2);
    });
  });
});
