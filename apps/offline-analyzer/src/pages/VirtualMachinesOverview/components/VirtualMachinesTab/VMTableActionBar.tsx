import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  type MenuToggleElement,
  Pagination,
  Spinner,
  ToolbarItem,
} from "@patternfly/react-core";
import type React from "react";
import type { VMTableVariantUI } from "./vmTableShared";
import type { VMTableLogic } from "./vmTableTypes";

export interface VMTableActionBarProps {
  logic: VMTableLogic;
  variantUI: VMTableVariantUI;
  loading: boolean;
  vms: VirtualMachine[];
  totalVMs?: number;
  selectedVMs: Set<string>;
  onPageChange?: (page: number, pageSize: number) => void;
  isGroupRowActions: boolean;
  onExcludeFromReports?: (vmIds: string[]) => Promise<void>;
  onIncludeInReports?: (vmIds: string[]) => Promise<void>;
  onAddLabels?: (vmIds: string[]) => void;
  onManageLabels?: () => void;
  onCreateGroup?: (vmIds: string[]) => void;
  onAddToGroup?: (vmIds: string[]) => void;
  onRemoveFromGroup?: (vmIds: string[]) => void;
}

export const VMTableActionBar: React.FC<VMTableActionBarProps> = ({
  logic,
  variantUI,
  loading,
  vms,
  totalVMs,
  selectedVMs,
  onPageChange,
  isGroupRowActions,
  onExcludeFromReports,
  onIncludeInReports,
  onAddLabels,
  onManageLabels,
  onCreateGroup,
  onAddToGroup,
  onRemoveFromGroup,
}) => {
  const {
    page,
    pageSize,
    isActionsMenuOpen,
    setIsActionsMenuOpen,
    setIsExcludeModalOpen,
    setIsIncludeModalOpen,
    selectedVmIds,
    canRemoveSelectedFromGroup,
    selectedExcludedIds,
    selectedIncludedIds,
  } = logic;

  const { hideToolbarActions } = variantUI;

  return (
    <>
      {!hideToolbarActions && (
        <ToolbarItem>
          <Dropdown
            isOpen={isActionsMenuOpen}
            onSelect={() => setIsActionsMenuOpen(false)}
            onOpenChange={setIsActionsMenuOpen}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                isExpanded={isActionsMenuOpen}
                variant="secondary"
              >
                Actions
              </MenuToggle>
            )}
            popperProps={{ position: "right" }}
          >
            <DropdownList>
              {onExcludeFromReports && selectedIncludedIds.length > 0 && (
                <DropdownItem
                  key="exclude-from-reports"
                  onClick={() => setIsExcludeModalOpen(true)}
                >
                  Exclude from reports
                </DropdownItem>
              )}
              {onIncludeInReports && selectedExcludedIds.length > 0 && (
                <DropdownItem
                  key="include-in-reports"
                  onClick={() => setIsIncludeModalOpen(true)}
                >
                  Include in reports
                </DropdownItem>
              )}
              <DropdownItem
                key="add-label"
                isDisabled={selectedVMs.size === 0}
                onClick={() => onAddLabels?.(Array.from(selectedVMs))}
              >
                Add labels
              </DropdownItem>
              <DropdownItem
                key="manage-labels"
                onClick={() => onManageLabels?.()}
              >
                Manage all labels
              </DropdownItem>
              {!isGroupRowActions && (
                <>
                  <DropdownItem
                    key="create-group"
                    isDisabled={selectedVMs.size === 0 || !onCreateGroup}
                    onClick={() => onCreateGroup?.(selectedVmIds)}
                  >
                    Create group
                  </DropdownItem>
                  <DropdownItem
                    key="add-to-group"
                    isDisabled={selectedVMs.size === 0 || !onAddToGroup}
                    onClick={() => onAddToGroup?.(selectedVmIds)}
                  >
                    Add to group
                  </DropdownItem>
                </>
              )}
              <Divider key="separator" component="li" />
              <DropdownItem
                key="remove-from-group"
                isDisabled={
                  selectedVMs.size === 0 ||
                  !canRemoveSelectedFromGroup ||
                  !onRemoveFromGroup
                }
                onClick={() => onRemoveFromGroup?.(selectedVmIds)}
              >
                Remove from group
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </ToolbarItem>
      )}
      <ToolbarItem align={{ default: "alignEnd" }}>
        <Flex
          alignItems={{ default: "alignItemsCenter" }}
          gap={{ default: "gapMd" }}
        >
          <FlexItem>
            {loading && vms.length > 0 && <Spinner size="sm" />}
          </FlexItem>
          <FlexItem>
            <Pagination
              itemCount={totalVMs ?? vms.length}
              perPage={pageSize}
              page={page}
              onSetPage={(_event, newPage) => onPageChange?.(newPage, pageSize)}
              onPerPageSelect={(_event, newPerPage) => {
                onPageChange?.(1, newPerPage);
              }}
              variant="top"
              isCompact
            />
          </FlexItem>
        </Flex>
      </ToolbarItem>
    </>
  );
};

VMTableActionBar.displayName = "VMTableActionBar";
