import type { MigrationComplexityResponseLike } from "@openshift-migration-advisor/shared-components";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAgentApiClient } from "../../api/agentApiClient";
import { getAgentApiBasePath } from "../../api/agentApiConfig";
import { calculateMigrationComplexity } from "./migrationComplexityApi";

export interface UseComplexityToolViewModelOptions {
  autoLoad?: boolean;
}

export interface ComplexityToolViewModel {
  complexityEstimation: MigrationComplexityResponseLike | null;
  isCalculatingComplexity: boolean;
  complexityError: Error | null;
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
  const requestRef = useRef(0);

  const calculate = useCallback(async () => {
    const requestId = ++requestRef.current;
    setIsCalculatingComplexity(true);
    setComplexityError(null);

    try {
      const result = await calculateMigrationComplexity(
        getAgentApiBasePath(getAgentApiClient()),
        filterExpression,
      );
      if (requestId === requestRef.current) {
        setComplexityEstimation(result);
      }
    } catch (err) {
      if (requestId === requestRef.current) {
        setComplexityError(
          err instanceof Error ? err : new Error("Request failed"),
        );
        setComplexityEstimation(null);
      }
    } finally {
      if (requestId === requestRef.current) {
        setIsCalculatingComplexity(false);
      }
    }
  }, [filterExpression]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }
    setComplexityEstimation(null);
    void calculate();
  }, [autoLoad, calculate]);

  const initialLoading =
    autoLoad && complexityEstimation === null && !complexityError;

  return {
    complexityEstimation,
    isCalculatingComplexity: isCalculatingComplexity || initialLoading,
    complexityError,
  };
}
