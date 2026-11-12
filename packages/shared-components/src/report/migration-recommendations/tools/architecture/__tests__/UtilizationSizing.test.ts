import { describe, expect, it } from "vitest";
import {
  mockClusterRequirementsResponse,
  mockUtilizationComparisonResponse,
} from "../__fixtures__/clusterRequirementsResponse.mock.js";
import {
  computeEffectiveCpu,
  computeEffectiveMemory,
  formatUtilizationPercent,
  getOptimizationStatusMessage,
  hasUtilizationComparison,
} from "../utilizationSizing.js";

const mockOptimizedSizing =
  mockUtilizationComparisonResponse.optimizedSizing ?? {
    totalNodes: 0,
    workerNodes: 0,
    controlPlaneNodes: 0,
    failoverNodes: 0,
    totalCPU: 0,
    totalMemory: 0,
  };

describe("UtilizationSizing", () => {
  describe("hasUtilizationComparison", () => {
    it("returns true when optimization succeeded with confidence above 50%", () => {
      expect(hasUtilizationComparison(mockUtilizationComparisonResponse)).toBe(
        true,
      );
    });

    it("returns false for baseline-only response", () => {
      expect(hasUtilizationComparison(mockClusterRequirementsResponse)).toBe(
        false,
      );
    });

    it("returns false when output is undefined", () => {
      expect(hasUtilizationComparison(undefined)).toBe(false);
    });

    it("returns false when output is null", () => {
      expect(hasUtilizationComparison(null)).toBe(false);
    });

    it("returns false when confidence is below 50%", () => {
      expect(
        hasUtilizationComparison({
          ...mockUtilizationComparisonResponse,
          optimizedSizing: {
            ...mockOptimizedSizing,
            confidence: 49,
          },
        }),
      ).toBe(false);
    });

    it("returns true when confidence is exactly 50%", () => {
      expect(
        hasUtilizationComparison({
          ...mockUtilizationComparisonResponse,
          optimizedSizing: {
            ...mockOptimizedSizing,
            confidence: 50,
          },
        }),
      ).toBe(true);
    });

    it("returns false when optimization reason is low_confidence", () => {
      expect(
        hasUtilizationComparison({
          ...mockUtilizationComparisonResponse,
          optimizationStatus: {
            attempted: true,
            reason: "low_confidence",
          },
        }),
      ).toBe(false);
    });
  });

  describe("getOptimizationStatusMessage", () => {
    it("returns undefined when comparison is shown", () => {
      expect(
        getOptimizationStatusMessage(mockUtilizationComparisonResponse),
      ).toBeUndefined();
    });

    it("returns a message for no_utilization_data", () => {
      expect(
        getOptimizationStatusMessage({
          ...mockClusterRequirementsResponse,
          optimizationStatus: {
            attempted: false,
            reason: "no_utilization_data",
          },
        }),
      ).toContain("Actual usage data is not available");
    });

    it("returns a message when reason is success but comparison is unavailable", () => {
      expect(
        getOptimizationStatusMessage({
          ...mockClusterRequirementsResponse,
          optimizationStatus: {
            attempted: true,
            reason: "success",
          },
        }),
      ).toContain("Utilization-based comparison is not available");
    });
  });

  describe("formatUtilizationPercent", () => {
    it("formats values with one decimal place", () => {
      expect(formatUtilizationPercent(45.2)).toBe("45.2%");
      expect(formatUtilizationPercent(87.5)).toBe("87.5%");
    });

    it("returns an em dash when value is undefined", () => {
      expect(formatUtilizationPercent(undefined)).toBe("—");
    });
  });

  describe("computeEffectiveCpu", () => {
    it("applies utilization percentage to inventory CPU", () => {
      expect(computeEffectiveCpu(885, 45.2)).toBe(400);
    });
  });

  describe("computeEffectiveMemory", () => {
    it("applies utilization percentage to inventory memory", () => {
      expect(computeEffectiveMemory(2003, 62.3)).toBe(1248);
    });
  });
});
