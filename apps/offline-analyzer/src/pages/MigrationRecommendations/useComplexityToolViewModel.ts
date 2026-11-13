import {
  DEFAULT_ESTIMATION_FORM_VALUES,
  type MigrationComplexityResponseLike,
  type MigrationEstimationByComplexityResponseLike,
} from "@openshift-migration-advisor/shared-components";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAgentApiClient } from "../../api/agentApiClient";
import { getAgentApiBasePath } from "../../api/agentApiConfig";
import { estimationFormToParams } from "./estimationFormParams";
import { calculateMigrationComplexity } from "./migrationComplexityApi";
import { calculateMigrationEstimationByComplexity } from "./migrationEstimationApi";

const DEFAULT_SCHEMAS = ["network-based", "storage-offload"] as const;

export interface UseComplexityToolViewModelOptions {
  autoLoad?: boolean;
}

export interface ComplexityToolViewModel {
  complexityEstimation: MigrationComplexityResponseLike | null;
  isCalculatingComplexity: boolean;
  complexityError: Error | null;
  estimationByComplexity: MigrationEstimationByComplexityResponseLike | null;
  isLoadingEstimationByComplexity: boolean;
  estimationByComplexityError: Error | null;
}

export function useComplexityToolViewModel(
  filterExpression: string | undefined,
  options?: UseComplexityToolViewModelOptions,
): ComplexityToolViewModel {
  const autoLoad = options?.autoLoad ?? true;
  const [complexityEstimation, setComplexityEstimation] =
    useState<MigrationComplexityResponseLike | null>(null);
  const [isCalculatingComplexity, setIsCalculatingComplexity] = useState(false);
  const [complexityError, setComplexityError] = useState<Error | null>(null);
  const [estimationByComplexity, setEstimationByComplexity] =
    useState<MigrationEstimationByComplexityResponseLike | null>(null);
  const [isLoadingEstimationByComplexity, setIsLoadingEstimationByComplexity] =
    useState(false);
  const [estimationByComplexityError, setEstimationByComplexityError] =
    useState<Error | null>(null);
  const complexityRequestRef = useRef(0);
  const estimationRequestRef = useRef(0);

  const calculateComplexity = useCallback(async () => {
    const requestId = ++complexityRequestRef.current;
    setIsCalculatingComplexity(true);
    setComplexityError(null);

    try {
      const result = await calculateMigrationComplexity(
        getAgentApiBasePath(getAgentApiClient()),
        filterExpression,
      );
      if (requestId === complexityRequestRef.current) {
        setComplexityEstimation(result);
      }
    } catch (err) {
      if (requestId === complexityRequestRef.current) {
        setComplexityError(
          err instanceof Error ? err : new Error("Request failed"),
        );
        setComplexityEstimation(null);
      }
    } finally {
      if (requestId === complexityRequestRef.current) {
        setIsCalculatingComplexity(false);
      }
    }
  }, [filterExpression]);

  const calculateEstimationByComplexity = useCallback(async () => {
    const requestId = ++estimationRequestRef.current;
    setIsLoadingEstimationByComplexity(true);
    setEstimationByComplexityError(null);

    try {
      const result = await calculateMigrationEstimationByComplexity(
        getAgentApiBasePath(getAgentApiClient()),
        {
          filterExpression,
          estimationSchema: [...DEFAULT_SCHEMAS],
          params: estimationFormToParams(DEFAULT_ESTIMATION_FORM_VALUES),
        },
      );
      if (requestId === estimationRequestRef.current) {
        setEstimationByComplexity(result);
      }
    } catch (err) {
      if (requestId === estimationRequestRef.current) {
        setEstimationByComplexityError(
          err instanceof Error ? err : new Error("Request failed"),
        );
        setEstimationByComplexity(null);
      }
    } finally {
      if (requestId === estimationRequestRef.current) {
        setIsLoadingEstimationByComplexity(false);
      }
    }
  }, [filterExpression]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }
    setComplexityEstimation(null);
    setEstimationByComplexity(null);
    void calculateComplexity();
    void calculateEstimationByComplexity();
  }, [autoLoad, calculateComplexity, calculateEstimationByComplexity]);

  const initialComplexityLoading =
    autoLoad && complexityEstimation === null && !complexityError;
  const initialEstimationLoading =
    autoLoad && estimationByComplexity === null && !estimationByComplexityError;

  return {
    complexityEstimation,
    isCalculatingComplexity:
      isCalculatingComplexity || initialComplexityLoading,
    complexityError,
    estimationByComplexity,
    isLoadingEstimationByComplexity:
      isLoadingEstimationByComplexity || initialEstimationLoading,
    estimationByComplexityError,
  };
}
