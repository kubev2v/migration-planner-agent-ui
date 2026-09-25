import { css } from "@emotion/css";
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  type MenuToggleElement,
  Spinner,
} from "@patternfly/react-core";
import { DownloadIcon } from "@patternfly/react-icons";
import { type FC, type Ref, useState } from "react";
import {
  type ReportExportOption,
  type StandardReportExportHandlers,
  standardReportExportOptions,
} from "./reportExportOptions.js";

const dropdownListReset = css`
  margin: 0 !important;
  padding: 0 !important;

  .pf-v6-c-menu__list-item {
    background-color: var(
      --pf-t--global--background--color--primary--default
    ) !important;
  }
  .pf-v6-c-menu__list-item:hover {
    background-color: var(
      --pf-t--global--background--color--primary--hover
    ) !important;
  }
`;

const menuToggleGap = css`
  --pf-v6-c-menu-toggle--Gap: var(--pf-t--global--spacer--sm);
`;

export interface ReportExportMenuProps {
  options: ReportExportOption[];
  isLoading?: boolean;
  loadingLabel?: string | null;
  isDisabled?: boolean;
  toggleLabel?: string;
}

export const ReportExportMenu: FC<ReportExportMenuProps> = ({
  options,
  isLoading = false,
  loadingLabel = null,
  isDisabled = false,
  toggleLabel = "Export",
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (options.length === 0) {
    return null;
  }

  return (
    <Dropdown
      isOpen={isDropdownOpen}
      popperProps={{
        placement: "bottom-end",
        preventOverflow: true,
      }}
      onSelect={() => {
        setIsDropdownOpen(false);
      }}
      onOpenChange={(isOpen: boolean) => {
        setIsDropdownOpen(isOpen);
      }}
      toggle={(toggleRef: Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => {
            setIsDropdownOpen((open) => !open);
          }}
          isExpanded={isDropdownOpen}
          variant="secondary"
          isDisabled={isLoading || isDisabled}
          aria-label="Export report options"
          className={menuToggleGap}
          icon={
            isLoading ? (
              <Spinner size="sm" aria-hidden="true" />
            ) : (
              <DownloadIcon aria-hidden="true" />
            )
          }
        >
          {isLoading ? (loadingLabel ?? "Generating...") : toggleLabel}
        </MenuToggle>
      )}
    >
      <DropdownList className={dropdownListReset}>
        {options.map((option) => (
          <DropdownItem
            key={option.key}
            isDisabled={option.isDisabled}
            description={option.description}
            onClick={option.onSelect}
          >
            {option.label}
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  );
};

ReportExportMenu.displayName = "ReportExportMenu";

export interface ExportReportButtonProps extends StandardReportExportHandlers {
  extraOptions?: ReportExportOption[];
  isLoading?: boolean;
  loadingLabel?: string | null;
  isDisabled?: boolean;
  toggleLabel?: string;
}

export const ExportReportButton: FC<ExportReportButtonProps> = ({
  onExportPdf,
  onExportPng,
  onExportHtml,
  extraOptions = [],
  ...menuProps
}) => (
  <ReportExportMenu
    options={[
      ...standardReportExportOptions({
        onExportPdf,
        onExportPng,
        onExportHtml,
      }),
      ...extraOptions,
    ]}
    {...menuProps}
  />
);

ExportReportButton.displayName = "ExportReportButton";
