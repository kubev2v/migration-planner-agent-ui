import { describe, expect, it } from "vitest";
import { migrateLegacyWizardState } from "./forecasterSession";

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
