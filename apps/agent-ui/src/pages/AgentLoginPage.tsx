import { AgentModeRequestModeEnum } from "@openshift-migration-advisor/agent-sdk";
import { Backdrop, Bullseye } from "@patternfly/react-core";
import type React from "react";
import { useEffect } from "react";
import { useAgentStatus } from "../common/AgentStatusContext";
import { MainVCenterCredentialsModal } from "../credentials/MainVCenterCredentialsModal";
import { useLoginViewModel } from "../credentials/UseCredentialViewModel";

const AgentLoginPage: React.FC = () => {
  const { agentStatus, refetch: refetchAgentStatus } = useAgentStatus();
  const vm = useLoginViewModel({ refetchAgentStatus });

  useEffect(() => {
    document.title = "Migration Advisor";
  }, []);

  return (
    <Backdrop style={{ overflow: "auto" }}>
      <Bullseye style={{ height: "100vh", padding: "1rem" }}>
        <MainVCenterCredentialsModal
          isOpen={true}
          version={vm.version}
          isDataShared={
            agentStatus?.mode === AgentModeRequestModeEnum.Connected
          }
          isCollecting={vm.isCollecting}
          status={vm.status}
          error={vm.error}
          onCollect={vm.onCollect}
          onCancel={vm.onCancel}
        />
      </Bullseye>
    </Backdrop>
  );
};

AgentLoginPage.displayName = "AgentLoginPage";

export default AgentLoginPage;
