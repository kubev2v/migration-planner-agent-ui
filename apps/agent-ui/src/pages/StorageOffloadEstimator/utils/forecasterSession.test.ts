import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CANCELED_PAIRS_SESSION_KEY,
  clearWizardState,
  loadCanceledPairKeys,
  migrateLegacyWizardState,
  saveCanceledPairKeys,
} from "./forecasterSession";

describe("migrateLegacyWizardState", () => {
  it("maps running and results to results pageView", () => {
    expect(
      migrateLegacyWizardState({
        url: "",
        username: "",
        pageView: "empty",
        credentialsSubmitted: false,
        datastores: [],
        pairs: [],
        activeStep: "running",
      }).pageView,
    ).toBe("results");

    expect(
      migrateLegacyWizardState({
        url: "",
        username: "",
        pageView: "empty",
        credentialsSubmitted: false,
        datastores: [],
        pairs: [],
        activeStep: "results",
      }).pageView,
    ).toBe("results");
  });

  it("maps credentials and select-pairs to empty pageView", () => {
    expect(
      migrateLegacyWizardState({
        url: "",
        username: "",
        pageView: "empty",
        credentialsSubmitted: false,
        datastores: [],
        pairs: [],
        activeStep: "credentials",
      }).pageView,
    ).toBe("empty");

    expect(
      migrateLegacyWizardState({
        url: "https://vcenter.example.com",
        username: "admin",
        pageView: "empty",
        credentialsSubmitted: false,
        datastores: [{ name: "ds-a", type: "VMFS", capacityGb: 1, freeGb: 1 }],
        pairs: [],
        activeStep: "select-pairs",
      }),
    ).toMatchObject({
      pageView: "empty",
      credentialsSubmitted: true,
    });
  });

  it("leaves modern state unchanged", () => {
    const modern = {
      url: "u",
      username: "n",
      pageView: "results" as const,
      credentialsSubmitted: true,
      datastores: [],
      pairs: [],
    };
    expect(migrateLegacyWizardState(modern)).toEqual(modern);
  });
});

describe("canceled pair session storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("persists and reloads canceled pair keys", () => {
    saveCanceledPairKeys(new Set(["MOCK-DS-A||MOCK-DS-B"]));
    expect(loadCanceledPairKeys()).toEqual(new Set(["MOCK-DS-A||MOCK-DS-B"]));
  });

  it("clears canceled pair keys when wizard state is cleared", () => {
    saveCanceledPairKeys(new Set(["MOCK-DS-A||MOCK-DS-B"]));
    clearWizardState();
    expect(sessionStorage.getItem(CANCELED_PAIRS_SESSION_KEY)).toBeNull();
    expect(loadCanceledPairKeys()).toEqual(new Set());
  });
});
