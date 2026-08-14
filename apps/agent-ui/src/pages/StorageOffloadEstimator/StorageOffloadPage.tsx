import { useInjection } from "@migration-planner-ui/ioc";
import { PageSection } from "@patternfly/react-core";
import type React from "react";
import { useMemo } from "react";
import type { DefaultApiInterface } from "../../api/agentApi";
import { getAgentApiBasePath } from "../../api/agentApiConfig";
import { Symbols } from "../../main/Symbols";
import { StorageOffloadTab } from "./components/StorageOffloadTab";

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
