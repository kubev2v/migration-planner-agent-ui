import { describe, expect, it } from "vitest";
import {
  getApplicationCertificationStatus,
  getCertificationStatusLabel,
} from "./applicationCertification";

describe("getApplicationCertificationStatus", () => {
  it("returns certified for catalog applications validated on RHEL/OpenShift", () => {
    expect(getApplicationCertificationStatus("Nginx")).toBe("certified");
    expect(getApplicationCertificationStatus("PostgreSQL")).toBe("certified");
  });

  it("returns non-certified for applications outside the catalog", () => {
    expect(getApplicationCertificationStatus("Custom portal")).toBe(
      "non-certified",
    );
  });
});

describe("getCertificationStatusLabel", () => {
  it("returns user-facing labels", () => {
    expect(getCertificationStatusLabel("certified")).toBe("Certified");
    expect(getCertificationStatusLabel("non-certified")).toBe("Non-certified");
  });
});
