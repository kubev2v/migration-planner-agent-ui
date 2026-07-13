import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import {
  Button,
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
  Switch,
  ToolbarItem,
  Tooltip,
} from "@patternfly/react-core";
import { MagicIcon } from "@patternfly/react-icons";
import type React from "react";
import { useId } from "react";
import { useCapability } from "../../../../credentials/CredentialsContext";
import {
  DEEP_INSPECTION_BUSY_TOOLTIP,
  isDeepInspectionInProgress,
} from "./vmInspectionUtils";
import type { VMTableVariantUI } from "./vmTableShared";
import type { VMTableLogic } from "./vmTableTypes";

export interface VMTableActionBarProps {
  logic: VMTableLogic;
  variantUI: VMTableVariantUI;
  loading: boolean;
  vms: VirtualMachine[];
  totalVMs?: number;
  selectedVMs: Set<string>;
  showExcludedVMs: boolean;
  onShowExcludedVMsChange?: (show: boolean) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  inspectionActive: boolean;
  isGroupRowActions: boolean;
  onExcludeFromReports?: (vmIds: string[]) => Promise<void>;
  onIncludeInReports?: (vmIds: string[]) => Promise<void>;
  onAddLabels?: (vmIds: string[]) => void;
  onManageLabels?: () => void;
  onCreateGroup?: (vmIds: string[]) => void;
  onAddToGroup?: (vmIds: string[]) => void;
  onRemoveFromGroup?: (vmIds: string[]) => void;
  onRunDeepInspection?: (includeVmId?: string) => void;
  onResetInspection?: () => void;
  onStopInspection?: () => void;
}

export const VMTableActionBar: React.FC<VMTableActionBarProps> = ({
  logic,
  variantUI,
  loading,
  vms,
  totalVMs,
  selectedVMs,
  showExcludedVMs,
  onShowExcludedVMsChange,
  onPageChange,
  inspectionActive,
  isGroupRowActions,
  onExcludeFromReports,
  onIncludeInReports,
  onAddLabels,
  onManageLabels,
  onCreateGroup,
  onAddToGroup,
  onRemoveFromGroup,
  onRunDeepInspection,
  onResetInspection,
  onStopInspection,
}) => {
  const {
    shouldShowTooltip,
    shouldRequestCredentials,
    errorTooltipContent,
    openEditModal,
  } = useCapability("inspector");
  const showExcludedSwitchId = useId();
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
  const inspectionInProgress = isDeepInspectionInProgress(
    inspectionActive,
    vms,
  );

  const actionsDropdown = (
    <Dropdown
      isOpen={isActionsMenuOpen}
      onSelect={() => setIsActionsMenuOpen(false)}
      onOpenChange={(isOpen) => {
        if (!inspectionInProgress) {
          setIsActionsMenuOpen(isOpen);
        }
      }}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => {
            if (!inspectionInProgress) {
              setIsActionsMenuOpen(!isActionsMenuOpen);
            }
          }}
          isExpanded={isActionsMenuOpen}
          variant="secondary"
          isDisabled={inspectionInProgress}
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
            isDisabled={inspectionInProgress}
            onClick={() => setIsExcludeModalOpen(true)}
          >
            Exclude from reports
          </DropdownItem>
        )}
        {onIncludeInReports && selectedExcludedIds.length > 0 && (
          <DropdownItem
            key="include-in-reports"
            isDisabled={inspectionInProgress}
            onClick={() => setIsIncludeModalOpen(true)}
          >
            Include in reports
          </DropdownItem>
        )}
        <DropdownItem
          key="add-label"
          isDisabled={inspectionInProgress || selectedVMs.size === 0}
          onClick={() => onAddLabels?.(Array.from(selectedVMs))}
        >
          Add labels
        </DropdownItem>
        <DropdownItem
          key="manage-labels"
          isDisabled={inspectionInProgress}
          onClick={() => onManageLabels?.()}
        >
          Manage all labels
        </DropdownItem>
        {!isGroupRowActions && (
          <>
            <DropdownItem
              key="create-group"
              isDisabled={
                inspectionInProgress || selectedVMs.size === 0 || !onCreateGroup
              }
              onClick={() => onCreateGroup?.(selectedVmIds)}
            >
              Create group
            </DropdownItem>
            <DropdownItem
              key="add-to-group"
              isDisabled={
                inspectionInProgress || selectedVMs.size === 0 || !onAddToGroup
              }
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
            inspectionInProgress ||
            selectedVMs.size === 0 ||
            !canRemoveSelectedFromGroup ||
            !onRemoveFromGroup
          }
          onClick={() => onRemoveFromGroup?.(selectedVmIds)}
        >
          Remove from group
        </DropdownItem>
        <DropdownItem
          key="reset-deep-inspection"
          isDisabled={inspectionInProgress || selectedVMs.size === 0}
          onClick={() => onResetInspection?.()}
        >
          Reset deep inspection
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );

  return (
    <>
      {!hideToolbarActions && (
        <>
          <ToolbarItem>
            {inspectionInProgress ? (
              <Tooltip content={DEEP_INSPECTION_BUSY_TOOLTIP}>
                <span>{actionsDropdown}</span>
              </Tooltip>
            ) : (
              actionsDropdown
            )}
          </ToolbarItem>

          <ToolbarItem>
            {shouldShowTooltip ? (
              <Tooltip content={errorTooltipContent}>
                <Button variant="primary" icon={<MagicIcon />} isAriaDisabled>
                  Run deep inspection
                </Button>
              </Tooltip>
            ) : (
              <Tooltip
                content={
                  inspectionInProgress
                    ? "Deep inspection is already in progress."
                    : "Select VMs for deep inspection."
                }
              >
                <Button
                  variant="primary"
                  icon={<MagicIcon />}
                  isAriaDisabled={
                    selectedVMs.size === 0 || inspectionInProgress
                  }
                  onClick={() => {
                    if (shouldRequestCredentials) {
                      openEditModal(() => onRunDeepInspection?.());
                    } else {
                      onRunDeepInspection?.();
                    }
                  }}
                >
                  Run deep inspection
                </Button>
              </Tooltip>
            )}
          </ToolbarItem>
          {inspectionInProgress && (
            <>
              <ToolbarItem>
                <Spinner size="md" />
              </ToolbarItem>
              {onStopInspection && (
                <ToolbarItem>
                  <Button variant="secondary" onClick={onStopInspection}>
                    Stop inspection
                  </Button>
                </ToolbarItem>
              )}
            </>
          )}
        </>
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
            {onShowExcludedVMsChange && (
              <Switch
                id={showExcludedSwitchId}
                label="Show excluded VMs"
                isChecked={showExcludedVMs}
                onChange={(_event, checked) => {
                  onShowExcludedVMsChange(checked);
                }}
              />
            )}
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
