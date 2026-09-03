import { Bullseye, Spinner } from "@patternfly/react-core";
import type React from "react";
import { Navigate } from "react-router-dom";
import { useAgentStatus } from "../common/useAgentStatus";
import { useListCollectionsQuery } from "../store/api/comparisonEndpoints";
import { PageLayout } from "./PageLayout";

/**
 * Protected route wrapper for the application.
 * Allows access when at least one collection already exists; otherwise the user
 * is redirected to the login.
 */
export const ProtectedRoute: React.FC = () => {
  const { isRvtoolsMode } = useAgentStatus();
  const { data: collections, isFetching } = useListCollectionsQuery();

  if (collections && collections.length > 0) {
    return <PageLayout />;
  }

  if (isFetching) {
    return (
      <Bullseye style={{ height: "100vh" }}>
        <Spinner aria-label="Loading report" />
      </Bullseye>
    );
  }

  return <Navigate to={isRvtoolsMode ? "/rvtools-upload" : "/login"} replace />;
};

ProtectedRoute.displayName = "ProtectedRoute";
