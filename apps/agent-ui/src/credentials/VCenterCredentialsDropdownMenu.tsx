import { css } from "@emotion/css";
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
import {
  type CredentialStatusType,
  useCredentials,
} from "./CredentialsContext";
import { RemoveVCenterConnectionModal } from "./RemoveVCenterConnectionModal";
import { VCenterCredentialsModal } from "./VCenterCredentialsModal";

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
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  const {
    credentialStatus,
    credentialStatusType,
    isLoading,
    error,
    isEditModalOpen,
    openEditModal,
    closeEditModal,
    clearError,
    updateCredential,
    disconnectCredential,
  } = useCredentials();

  const openEditVCenterCredentialsModal = () => {
    setIsDropdownMenuOpen(false);
    openEditModal();
  };

  const openRemoveVCenterConnectionModal = () => {
    clearError();
    setIsDropdownMenuOpen(false);
    setIsRemoveModalOpen(true);
  };

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
        isUpdating={isLoading}
        error={error || ""}
        onClose={() => {
          const triggerSuccessCallback = false;
          closeEditModal(triggerSuccessCallback);
        }}
        onUpdate={(credentials) => {
          updateCredential(credentials)
            .then(() => {
              const triggerSuccessCallback = true;
              closeEditModal(triggerSuccessCallback);
            })
            .catch(() => {});
        }}
      />
      <RemoveVCenterConnectionModal
        isOpen={isRemoveModalOpen}
        isRemoving={isLoading}
        error={error || ""}
        onClose={() => setIsRemoveModalOpen(false)}
        onConfirm={() => {
          disconnectCredential()
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
