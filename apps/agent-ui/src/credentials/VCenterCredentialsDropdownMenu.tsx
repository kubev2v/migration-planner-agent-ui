import { css } from "@emotion/css";
import type { CredentialStatus } from "@openshift-migration-advisor/agent-sdk";
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Label,
  MenuToggle,
  type MenuToggleElement,
  Panel,
  PanelMain,
  PanelMainBody,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ClusterIcon,
  DisconnectedIcon,
  EditIcon,
  ExclamationCircleIcon,
  SpinnerIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useState } from "react";
import { useAgentStatus } from "../common/useAgentStatus";
import {
  useDeleteCredentialsMutation,
  useGetCredentialsQuery,
  usePutCredentialsMutation,
} from "../store/api/credentialsEndpoints";
import { getSdkErrorMessage } from "../store/baseQuery";
import { useCredentialsModal } from "./CredentialsModalController";
import { RemoveVCenterConnectionModal } from "./RemoveVCenterConnectionModal";
import { VCenterCredentialsModal } from "./VCenterCredentialsModal";

type CredentialStatusType =
  | "error"
  | "loading"
  | "connected"
  | "removed"
  | "editing";

function deriveCredentialStatusType(
  isEditModalOpen: boolean,
  hasError: boolean,
  isBusy: boolean,
  credentialStatus: CredentialStatus | null,
): CredentialStatusType {
  if (isEditModalOpen) return "editing";
  if (hasError) return "error";
  if (isBusy) return "loading";
  if (credentialStatus?.valid) return "connected";
  return "removed";
}

const connectedLabelStyles = css`
  margin-right: var(--pf-t--global--spacer--xs);
`;

const vcenterCredentialsDropdownStyles = css`
  max-width: 320px;
`;

function renderStatusLabel(
  status: CredentialStatusType,
  error: string | null,
): React.ReactElement {
  switch (status) {
    case "error":
      return (
        <Label
          isCompact
          color="red"
          icon={<ExclamationCircleIcon />}
          className={connectedLabelStyles}
          title={error || undefined}
        >
          Error
        </Label>
      );
    case "loading":
      return (
        <Label
          isCompact
          color="blue"
          icon={<SpinnerIcon />}
          className={connectedLabelStyles}
        >
          Loading
        </Label>
      );
    case "connected":
      return (
        <Label
          isCompact
          color="green"
          icon={<CheckCircleIcon />}
          className={connectedLabelStyles}
        >
          Connected
        </Label>
      );
    case "removed":
      return (
        <Label
          isCompact
          color="orange"
          icon={<DisconnectedIcon />}
          className={connectedLabelStyles}
        >
          Removed
        </Label>
      );
    case "editing":
      return (
        <Label
          isCompact
          color="purple"
          icon={<EditIcon />}
          className={connectedLabelStyles}
        >
          Updating
        </Label>
      );
  }
}

const VCenterCredentialsDropdownMenu: React.FC = () => {
  const { isRvtoolsMode } = useAgentStatus();
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  const { data: credentialStatus = null, isLoading: isLoadingCredentials } =
    useGetCredentialsQuery();
  const [
    putCredentials,
    { isLoading: isUpdating, error: updateError, reset: resetUpdate },
  ] = usePutCredentialsMutation();
  const [
    deleteCredentials,
    { isLoading: isRemoving, error: deleteError, reset: resetDelete },
  ] = useDeleteCredentialsMutation();
  const {
    isCredentialsModalOpen: isEditModalOpen,
    openCredentialsModal: openEditModal,
    closeCredentialModal: closeEditModal,
  } = useCredentialsModal();

  const updateErrorMessage = updateError
    ? getSdkErrorMessage(updateError, "Failed to update credentials.")
    : null;
  const removeErrorMessage = deleteError
    ? getSdkErrorMessage(deleteError, "Failed to disconnect.")
    : null;
  const error = updateErrorMessage ?? removeErrorMessage;
  const isBusy = isLoadingCredentials || isUpdating || isRemoving;
  const credentialStatusType = deriveCredentialStatusType(
    isEditModalOpen,
    error !== null,
    isBusy,
    credentialStatus,
  );

  const openEditVCenterCredentialsModal = () => {
    resetUpdate();
    setIsDropdownMenuOpen(false);
    openEditModal();
  };

  const openRemoveVCenterConnectionModal = () => {
    resetDelete();
    setIsDropdownMenuOpen(false);
    setIsRemoveModalOpen(true);
  };

  if (isRvtoolsMode) {
    return null;
  }

  return (
    <>
      <Dropdown
        isOpen={isDropdownMenuOpen}
        popperProps={{
          position: "right",
        }}
        onOpenChange={(isOpen: boolean) => setIsDropdownMenuOpen(isOpen)}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsDropdownMenuOpen(!isDropdownMenuOpen)}
            isExpanded={isDropdownMenuOpen}
            icon={<ClusterIcon />}
            className={vcenterCredentialsDropdownStyles}
          >
            {renderStatusLabel(credentialStatusType, error)}
            {credentialStatus?.username || "vCenter"}
          </MenuToggle>
        )}
        shouldFocusToggleOnSelect
      >
        <DropdownList>
          {credentialStatus === null ? (
            <DropdownItem
              key="connect"
              onClick={openEditVCenterCredentialsModal}
            >
              Connect vCenter
            </DropdownItem>
          ) : (
            <>
              <Panel>
                <PanelMain>
                  <PanelMainBody>
                    <DescriptionList isCompact>
                      <DescriptionListGroup>
                        <DescriptionListTerm>vCenter URL:</DescriptionListTerm>
                        <DescriptionListDescription>
                          {credentialStatus.url}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Username:</DescriptionListTerm>
                        <DescriptionListDescription>
                          {credentialStatus.username}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </PanelMainBody>
                </PanelMain>
              </Panel>

              <Divider component="li" />

              <DropdownItem
                key="edit"
                onClick={openEditVCenterCredentialsModal}
              >
                Edit vCenter credentials
              </DropdownItem>
              <DropdownItem
                key="disconnect"
                onClick={openRemoveVCenterConnectionModal}
              >
                Remove vCenter connection
              </DropdownItem>
            </>
          )}
        </DropdownList>
      </Dropdown>
      <VCenterCredentialsModal
        isOpen={isEditModalOpen}
        credentialStatus={credentialStatus}
        isUpdating={isUpdating}
        error={updateErrorMessage || ""}
        onClose={() => {
          const triggerSuccessCallback = false;
          closeEditModal(triggerSuccessCallback);
        }}
        onUpdate={(credentials) => {
          putCredentials({ vcenterCredentials: credentials })
            .unwrap()
            .then(() => {
              const triggerSuccessCallback = true;
              closeEditModal(triggerSuccessCallback);
            })
            .catch(() => {});
        }}
      />
      <RemoveVCenterConnectionModal
        isOpen={isRemoveModalOpen}
        isRemoving={isRemoving}
        error={removeErrorMessage || ""}
        onClose={() => setIsRemoveModalOpen(false)}
        onConfirm={() => {
          deleteCredentials()
            .unwrap()
            .then(() => {
              setIsRemoveModalOpen(false);
            })
            .catch(() => {});
        }}
      />
    </>
  );
};

VCenterCredentialsDropdownMenu.displayName = "VCenterCredentialsDropdownMenu";

export default VCenterCredentialsDropdownMenu;
