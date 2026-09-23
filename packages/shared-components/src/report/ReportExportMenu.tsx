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

export interface ReportExportMenuProps {
  options: ReportExportOption[];
  isLoading?: boolean;
  loadingLabel?: string | null;
  isDisabled?: boolean;
  toggleLabel?: string;
}

/**
 * Format-agnostic export dropdown for assessment reports.
 * Apps pass PDF/PNG/HTML via {@link standardReportExportOptions} plus any
 * extra formats (spreadsheet, ZIP, …).
 */
export const ReportExportMenu: FC<ReportExportMenuProps> = ({
  options,
  isLoading = false,
  loadingLabel = null,
  isDisabled = false,
  toggleLabel = "Export report",
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (options.length === 0) {
    return null;
  }

  return (
    <Dropdown
      isOpen={isDropdownOpen}
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
        >
          {isLoading ? (
            <>
              <Spinner size="sm" aria-hidden="true" />
              {loadingLabel ?? "Generating..."}
            </>
          ) : (
            <>
              <DownloadIcon aria-hidden="true" /> {toggleLabel}
            </>
          )}
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

/**
 * Convenience wrapper with PDF / HTML / PNG plus optional extra formats.
 * Omit a handler to hide that format (for example HTML on a cluster view).
 */
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
