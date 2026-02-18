import { AgentModeRequestModeEnum } from "@migration-planner-ui/agent-client/models";
import type React from "react";
import { useAgentStatus } from "../common/AgentStatusContext";
import { useLoginViewModel } from "../login-form/hooks/UseLoginViewModel";
import { LoginCard } from "../login-form/LoginCard";

const AgentLoginPage: React.FC = () => {
  const { agentStatus, refetch: refetchAgentStatus } = useAgentStatus();
  const vm = useLoginViewModel({ refetchAgentStatus });
  return (
    <LoginCard
      version={vm.version}
      isDataShared={agentStatus?.mode === AgentModeRequestModeEnum.Connected}
      isCollecting={vm.isCollecting}
      status={vm.status}
      error={vm.error}
      onCollect={vm.onCollect}
      onCancel={vm.onCancel}
    />
  );
};

AgentLoginPage.displayName = "AgentLoginPage";

export default AgentLoginPage;
