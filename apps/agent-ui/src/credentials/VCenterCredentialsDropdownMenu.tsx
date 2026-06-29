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
  ExclamationCircleIcon,
  SpinnerIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useState } from "react";
import { useCredentials } from "./CredentialsContext";
import { RemoveVCenterConnectionModal } from "./RemoveVCenterConnectionModal";
import { VCenterCredentialsModal } from "./VCenterCredentialsModal";

const connectedLabelStyles = css`
  margin-right: var(--pf-t--global--spacer--xs);
`;

const vcenterCredentialsDropdownStyles = css`
  max-width: 320px;
`;

const VCenterCredentialsDropdownMenu: React.FC = () => {
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  const {
    credentialStatus,
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
            {error ? (
              <Label
                isCompact
                color="red"
                icon={<ExclamationCircleIcon />}
                className={connectedLabelStyles}
              >
                Error
              </Label>
            ) : isLoading ? (
              <Label
                isCompact
                color="blue"
                icon={<SpinnerIcon />}
                className={connectedLabelStyles}
              >
                Loading
              </Label>
            ) : credentialStatus === null || !credentialStatus.valid ? (
              <Label
                isCompact
                color="orange"
                icon={<DisconnectedIcon />}
                className={connectedLabelStyles}
              >
                Disconnected
              </Label>
            ) : (
              <Label
                isCompact
                color="green"
                icon={<CheckCircleIcon />}
                className={connectedLabelStyles}
              >
                Connected
              </Label>
            )}
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
        onClose={closeEditModal}
        onUpdate={(credentials) => {
          updateCredential(credentials)
            .then(() => {
              closeEditModal();
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
