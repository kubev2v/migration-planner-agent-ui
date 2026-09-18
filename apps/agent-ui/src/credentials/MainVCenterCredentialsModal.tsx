import type {
  CollectorStatus,
  VcenterCredentials,
} from "@openshift-migration-advisor/agent-sdk";
import {
  Button,
  Content,
  Divider,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  Popover,
  Title,
} from "@patternfly/react-core";
import { OutlinedQuestionCircleIcon } from "@patternfly/react-icons";
import type React from "react";
import { useMemo, useState } from "react";
import { getCollectionProgressInfo } from "../common/collectionProgress";
import type { ApiError } from "../common/components/index";
import {
  CollectionProgress,
  DataSharingCheckbox,
  RedHatLogo,
} from "../common/components/index";
import { VCenterCredentialsForm } from "./VCenterCredentialsForm";

interface MainVCenterCredentialsModalProps {
  isOpen: boolean;
  version?: string;
  isDataShared: boolean;
  isCollecting: boolean;
  status: CollectorStatus["status"] | null;
  error: ApiError | null;
  onCollect: (credentials: VcenterCredentials, isDataShared: boolean) => void;
  onCancel: () => void;
}

export const MainVCenterCredentialsModal: React.FC<
  MainVCenterCredentialsModalProps
> = ({
  isOpen,
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
    () => getCollectionProgressInfo(status, error?.message),
    [status, error],
  );

  const handleSubmit = (credentials: VcenterCredentials) => {
    onCollect(credentials, isDataShared);
  };

  return (
    <Modal
      isOpen={isOpen}
      variant="medium"
      aria-labelledby="vcenter-credentials-modal-title"
    >
      <ModalBody>
        <Flex direction={{ default: "column" }} gap={{ default: "gapMd" }}>
          <FlexItem>
            <RedHatLogo />
          </FlexItem>

          <Flex
            justifyContent={{
              default: "justifyContentSpaceBetween",
            }}
            alignItems={{ default: "alignItemsCenter" }}
          >
            <FlexItem>
              <Title
                headingLevel="h1"
                size="2xl"
                id="vcenter-credentials-modal-title"
              >
                Migration Advisor Agent
              </Title>
            </FlexItem>
            {version && (
              <FlexItem>
                <Content component="small">ver {version}</Content>
              </FlexItem>
            )}
          </Flex>

          <FlexItem>
            <Content component="p">
              The migration discovery VM connects to your VMware environment to
              gather network topology, storage configuration, and VM inventory -
              providing recommendations for migrating to OpenShift
              Virtualization.
            </Content>
          </FlexItem>

          <Divider />

          <FlexItem>
            <Flex
              gap={{ default: "gapSm" }}
              alignItems={{ default: "alignItemsCenter" }}
            >
              <FlexItem>
                <Title headingLevel="h2" size="lg">
                  vCenter login
                </Title>
              </FlexItem>
              <FlexItem>
                <Popover
                  bodyContent="A VMware user account with read-only permissions is sufficient for secure access during the discovery process."
                  aria-label="vCenter login information"
                >
                  <OutlinedQuestionCircleIcon />
                </Popover>
              </FlexItem>
            </Flex>
          </FlexItem>

          <FlexItem>
            <VCenterCredentialsForm
              id="vcenter-credentials-form"
              onSubmit={handleSubmit}
              error={error?.message}
            />
          </FlexItem>

          <FlexItem>
            <DataSharingCheckbox
              isChecked={isDataShared}
              onChange={(checked: boolean) => setIsDataShared(checked)}
              isDisabled={isCollecting}
            />
          </FlexItem>
        </Flex>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="primary"
          type="submit"
          form="vcenter-credentials-form"
          isLoading={isCollecting}
          isDisabled={isCollecting}
        >
          Create assessment report
        </Button>
        {isCollecting && (
          <>
            <Button variant="link" onClick={onCancel}>
              Cancel
            </Button>
            <CollectionProgress
              percentage={progressInfo.percentage}
              statusText={progressInfo.statusText}
            />
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

MainVCenterCredentialsModal.displayName = "MainVCenterCredentialsModal";
