import { useInjection } from "@migration-planner-ui/ioc";
import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import { PageSection } from "@patternfly/react-core";
import type React from "react";
import { useMemo } from "react";
import { Symbols } from "../../main/Symbols";
import { getAgentApiBasePath } from "./agentApiConfig";
import { StorageOffloadTab } from "./components/storageOffload/StorageOffloadTab";

export const StorageOffloadPage: React.FC = () => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);

  const basePath = useMemo(() => getAgentApiBasePath(agentApi), [agentApi]);

  return (
    <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
      <StorageOffloadTab basePath={basePath} />
    </PageSection>
  );
};

StorageOffloadPage.displayName = "StorageOffloadPage";
