import {
  DEFAULT_ESTIMATION_FORM_VALUES,
  type EstimationFormValues,
  type MigrationEstimationResponseLike,
} from "@openshift-migration-advisor/shared-components";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAgentApiClient } from "../../api/agentApiClient";
import { getAgentApiBasePath } from "../../api/agentApiConfig";
import { estimationFormToParams } from "./estimationFormParams";
import { calculateMigrationEstimation } from "./migrationEstimationApi";

const DEFAULT_SCHEMAS = ["network-based", "storage-offload"] as const;

export interface TimeEstimationToolViewModel {
  estimationFormValues: EstimationFormValues;
  setEstimationFormValues: (values: EstimationFormValues) => void;
  migrationEstimation: MigrationEstimationResponseLike | null;
  isCalculatingEstimation: boolean;
  estimationError: Error | null;
  calculateEstimation: () => Promise<void>;
}

export function useTimeEstimationToolViewModel(
  filterExpression: string | undefined,
): TimeEstimationToolViewModel {
  const [estimationFormValues, setEstimationFormValues] =
    useState<EstimationFormValues>(DEFAULT_ESTIMATION_FORM_VALUES);
  const [migrationEstimation, setMigrationEstimation] =
    useState<MigrationEstimationResponseLike | null>(null);
  const [isCalculatingEstimation, setIsCalculatingEstimation] = useState(false);
  const [estimationError, setEstimationError] = useState<Error | null>(null);
  const requestRef = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when scope changes
  useEffect(() => {
    requestRef.current += 1;
    setMigrationEstimation(null);
    setEstimationError(null);
    setIsCalculatingEstimation(false);
  }, [filterExpression]);

  const calculateEstimation = useCallback(async () => {
    const requestId = ++requestRef.current;
    setIsCalculatingEstimation(true);
    setEstimationError(null);

    try {
      const result = await calculateMigrationEstimation(
        getAgentApiBasePath(getAgentApiClient()),
        {
          filterExpression,
          estimationSchema: [...DEFAULT_SCHEMAS],
          params: estimationFormToParams(estimationFormValues),
        },
      );

      if (requestId !== requestRef.current) {
        return;
      }

      const hasSchemas =
        result?.estimation && Object.keys(result.estimation).length > 0;
      setMigrationEstimation(hasSchemas ? result : null);
    } catch (err) {
      if (requestId !== requestRef.current) {
        return;
      }
      setEstimationError(
        err instanceof Error ? err : new Error("Request failed"),
      );
      setMigrationEstimation(null);
    } finally {
      if (requestId === requestRef.current) {
        setIsCalculatingEstimation(false);
      }
    }
  }, [estimationFormValues, filterExpression]);

  return {
    estimationFormValues,
    setEstimationFormValues,
    migrationEstimation,
    isCalculatingEstimation,
    estimationError,
    calculateEstimation,
  };
}
