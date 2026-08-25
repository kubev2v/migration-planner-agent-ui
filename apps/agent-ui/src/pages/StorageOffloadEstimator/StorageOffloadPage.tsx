import { PageSection } from "@patternfly/react-core";
import type React from "react";
import { getAgentApiClient } from "../../api/agentApiClient";
import { getAgentApiBasePath } from "../../api/agentApiConfig";
import { StorageOffloadTab } from "./components/StorageOffloadTab";

export const StorageOffloadPage: React.FC = () => {
  const basePath = getAgentApiBasePath(getAgentApiClient());

  return (
    <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
      <StorageOffloadTab basePath={basePath} />
    </PageSection>
  );
};

StorageOffloadPage.displayName = "StorageOffloadPage";
