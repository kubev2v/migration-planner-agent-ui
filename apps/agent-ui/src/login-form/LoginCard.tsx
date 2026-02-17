import type { CollectorStatus } from "@migration-planner-ui/agent-client/models";
import {
  Backdrop,
  Bullseye,
  Card,
  CardBody,
  CardHeader,
  Content,
  Divider,
  Flex,
  FlexItem,
  Icon,
  Popover,
  Title,
} from "@patternfly/react-core";
import {
  InfoCircleIcon,
  OutlinedQuestionCircleIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useMemo, useState } from "react";
import type { ApiError } from "../common/components/index";
import {
  CollectionProgress,
  DataSharingCheckbox,
  Information,
  PrivacyNote,
  RedHatLogo,
} from "../common/components/index";
import type { Credentials } from "./LoginFormComponent";
import { LoginFormComponent } from "./LoginFormComponent";

const getProgressInfo = (
  status: CollectorStatus["status"] | null,
  error?: ApiError | null,
): { percentage: number; statusText: string } => {
  switch (status) {
    case "ready":
      return { percentage: 0, statusText: "Ready to start" };
    case "connecting":
      return { percentage: 25, statusText: "Connecting to vCenter..." };
    case "connected":
      return {
        percentage: 50,
        statusText: "Connected, starting collection...",
      };
    case "collecting":
      return { percentage: 75, statusText: "Collecting inventory data..." };
    case "parsing":
      return { percentage: 90, statusText: "Parsing..." };
    case "collected":
      return { percentage: 100, statusText: "Collection complete" };
    case "error":
      return {
        percentage: 0,
        statusText: error?.message
          ? `Error: ${error.message}`
          : "Collection failed",
      };
    default:
      return { percentage: 0, statusText: "" };
  }
};

interface LoginCardProps {
  version?: string;
  isDataShared: boolean;
  isCollecting: boolean;
  status: CollectorStatus["status"] | null;
  error: ApiError | null;
  onCollect: (credentials: Credentials, isDataShared: boolean) => void;
  onCancel: () => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({
  version,
  isDataShared: initialIsDataShared,
  isCollecting,
  status,
  error,
  onCollect,
  onCancel,
}) => {
  const [isDataShared, setIsDataShared] = useState(initialIsDataShared);

  const progressInfo = useMemo(
    () => getProgressInfo(status, error),
    [status, error],
  );

  const handleCollect = (credentials: Credentials) => {
    onCollect(credentials, isDataShared);
  };

  return (
    <Backdrop style={{ overflow: "auto" }}>
      <Bullseye style={{ height: "100vh", padding: "1rem" }}>
        <Card
          style={{
            maxHeight: "calc(100vh - 2rem)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CardHeader>
            <Flex direction={{ default: "column" }} gap={{ default: "gapMd" }}>
              <FlexItem>
                <RedHatLogo />
              </FlexItem>

              <Flex
                justifyContent={{
                  default: "justifyContentSpaceBetween",
                }}
              >
                <FlexItem>
                  <Title headingLevel="h1" size="2xl">
                    Migration assessment
                  </Title>
                </FlexItem>
                {version && (
                  <FlexItem>
                    <Content component="small">Agent ver. {version}</Content>
                  </FlexItem>
                )}
              </Flex>

              <FlexItem>
                <Flex
                  gap={{ default: "gapSm" }}
                  alignItems={{ default: "alignItemsCenter" }}
                >
                  <FlexItem>
                    <Content component="p">Migration Discovery VM</Content>
                  </FlexItem>
                  <FlexItem>
                    <Popover bodyContent="The migration discovery VM requires access to your VMware environment to execute a discovery process that gathers essential data, including network topology, storage configuration, and VM inventory. The process leverages this information to provide recommendations for a seamless migration to OpenShift Virtualization.">
                      <OutlinedQuestionCircleIcon />
                    </Popover>
                  </FlexItem>
                </Flex>
              </FlexItem>

              <FlexItem>
                <Title headingLevel="h2" size="xl">
                  vCenter login
                </Title>
              </FlexItem>

              <FlexItem>
                <Flex
                  gap={{ default: "gapSm" }}
                  alignItems={{
                    default: "alignItemsFlexStart",
                  }}
                >
                  <FlexItem>
                    <Icon status="info">
                      <InfoCircleIcon />
                    </Icon>
                  </FlexItem>
                  <FlexItem>
                    <strong>Access control</strong>
                  </FlexItem>
                  <Flex
                    direction={{ default: "column" }}
                    gap={{ default: "gapXs" }}
                  >
                    <FlexItem>
                      <Content component="p">
                        A VMware user account with read-only permissions is
                        sufficient for secure access during the discovery
                        process.
                      </Content>
                    </FlexItem>
                  </Flex>
                </Flex>
              </FlexItem>
            </Flex>
          </CardHeader>

          <Divider />

          <CardBody style={{ overflow: "auto" }}>
            <LoginFormComponent
              collect={handleCollect}
              cancelCollection={onCancel}
              isLoading={isCollecting}
              dataSharingComponent={
                <DataSharingCheckbox
                  isChecked={isDataShared}
                  onChange={setIsDataShared}
                  isDisabled={isCollecting || isDataShared}
                />
              }
              informationComponent={
                <Information error={error}>
                  <PrivacyNote />
                </Information>
              }
              progressComponent={
                <CollectionProgress
                  percentage={progressInfo.percentage}
                  statusText={progressInfo.statusText}
                />
              }
            />
          </CardBody>
        </Card>
      </Bullseye>
    </Backdrop>
  );
};

LoginCard.displayName = "LoginCard";
