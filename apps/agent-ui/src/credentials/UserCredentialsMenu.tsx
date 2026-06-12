import { css } from "@emotion/css";
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  type MenuToggleElement,
} from "@patternfly/react-core";
import { UserIcon } from "@patternfly/react-icons";
import type React from "react";
import { useState } from "react";
import { useCredentials } from "./CredentialsContext";
import { EditCredentialsModal } from "./EditCredentialsModal";

const menuStyles = {
  toggle: css`
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 320px;
  `,
  username: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
};

export const UserCredentialsMenu: React.FC = () => {
  const { status, refresh, logout } = useCredentials();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = status?.username || "vCenter user";

  const handleRefresh = async () => {
    setRefreshing(true);
    setIsOpen(false);
    try {
      await refresh();
    } catch (err) {
      console.error("Failed to refresh credentials:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEdit = () => {
    setIsOpen(false);
    setIsEditOpen(true);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={(_event, open) => setIsOpen(open)}
        popperProps={{ position: "right" }}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsOpen(!isOpen)}
            isExpanded={isOpen}
            variant="plain"
            aria-label="User credentials menu"
            isDisabled={refreshing}
            className={menuStyles.toggle}
          >
            <UserIcon />
            <span className={menuStyles.username}>{displayName}</span>
          </MenuToggle>
        )}
      >
        <DropdownList>
          <DropdownItem key="edit" onClick={handleEdit}>
            Edit
          </DropdownItem>
          <DropdownItem key="refresh" onClick={handleRefresh}>
            Refresh
          </DropdownItem>
          <DropdownItem key="logout" onClick={handleLogout}>
            Log out
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      <EditCredentialsModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  );
};

UserCredentialsMenu.displayName = "UserCredentialsMenu";
