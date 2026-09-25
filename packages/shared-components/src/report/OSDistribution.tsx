import { css } from "@emotion/css";
import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  MenuToggle,
  type MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { DesktopIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { FC, Ref } from "react";
import { CardEmptyState } from "./CardEmptyState.js";
import { ChartHeaderActions } from "./ChartDownloadButton.js";
import { ChartExportSurface } from "./ChartExportSurface.js";
import { chartExportHideProps, chartExportScrollProps } from "./chartExport.js";
import { REPORT_CARD_EMPTY_STATE_TITLES } from "./constants.js";
import { dashboardStyles, tableFullWidthStyle } from "./dashboardStyles.js";
import { EmptySearchResults } from "./EmptySearchResults.js";
import { OsSupportTiersHelpPopover } from "./OsSupportTiersHelpPopover.js";
import { OsUpgradeNotice } from "./OsUpgradeNotice.js";
import { OsNameCell } from "./OsUpgradeRecommendationPopover.js";
import {
  getSupportTierLegendLabel,
  ORDERED_SUPPORT_TIERS,
  type OSDistributionEntry,
} from "./osSupportTier.js";
import { SupportTierBadge } from "./SupportTierBadge.js";
import {
  ALL_TIERS_FILTER,
  useOsBarChartViewModel,
} from "./useOsBarChartViewModel.js";

const tableScrollStyle = css`
  overflow: auto;
  max-height: 350px;
`;

const OS_DISTRIBUTION_CHART_ID = "os-distribution";
const OS_DISTRIBUTION_TITLE = "Operating system distribution";

interface OSDistributionProps {
  osData: Record<string, OSDistributionEntry>;
}

export const OSDistribution: FC<OSDistributionProps> = ({ osData }) => (
  <Card className={dashboardStyles.card} id={OS_DISTRIBUTION_CHART_ID}>
    <CardTitle>
      <Flex
        justifyContent={{ default: "justifyContentSpaceBetween" }}
        alignItems={{ default: "alignItemsCenter" }}
      >
        <FlexItem>
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            spaceItems={{ default: "spaceItemsSm" }}
          >
            <FlexItem>
              <DesktopIcon /> Operating Systems
            </FlexItem>
            <FlexItem {...chartExportHideProps}>
              <OsSupportTiersHelpPopover />
            </FlexItem>
          </Flex>
        </FlexItem>
        <ChartHeaderActions
          chartId={OS_DISTRIBUTION_CHART_ID}
          title={OS_DISTRIBUTION_TITLE}
        />
      </Flex>
    </CardTitle>
    <CardBody>
      <ChartExportSurface
        id={OS_DISTRIBUTION_CHART_ID}
        title={OS_DISTRIBUTION_TITLE}
      >
        <OSBarChart osData={osData} />
      </ChartExportSurface>
    </CardBody>
  </Card>
);

interface OSBarChartProps {
  osData: Record<string, OSDistributionEntry>;
}

export const OSBarChart: FC<OSBarChartProps> = ({ osData }) => {
  const vm = useOsBarChartViewModel(osData);

  if (vm.tableRows.length === 0) {
    return (
      <CardEmptyState title={REPORT_CARD_EMPTY_STATE_TITLES.operatingSystems} />
    );
  }

  return (
    <>
      <div {...chartExportHideProps}>
        <Toolbar hasNoPadding>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                placeholder="Filter by OS"
                value={vm.osFilter}
                onChange={(_event, value) => vm.setOsFilter(value)}
                onClear={vm.clearOsFilter}
                aria-label="Filter operating systems by name"
              />
            </ToolbarItem>
            <ToolbarItem>
              <Select
                isOpen={vm.isTierSelectOpen}
                selected={vm.tierFilter}
                onSelect={vm.handleTierSelect}
                onOpenChange={vm.setIsTierSelectOpen}
                toggle={(toggleRef: Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    isExpanded={vm.isTierSelectOpen}
                    onClick={vm.toggleTierSelectOpen}
                    isFullWidth
                  >
                    {vm.tierFilterLabel}
                  </MenuToggle>
                )}
                aria-label="Filter operating systems by support tier"
              >
                <SelectList>
                  <SelectOption value={ALL_TIERS_FILTER}>
                    All tiers
                  </SelectOption>
                  {ORDERED_SUPPORT_TIERS.map((tier) => (
                    <SelectOption key={tier} value={tier}>
                      {getSupportTierLegendLabel(tier)}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </div>

      <Stack hasGutter>
        {vm.showUpgradeNotice ? (
          <StackItem>
            <OsUpgradeNotice />
          </StackItem>
        ) : null}
        <StackItem>
          <div
            className={`${tableScrollStyle} ${tableFullWidthStyle}`}
            {...chartExportScrollProps}
          >
            <Table aria-label="Operating systems" variant="compact">
              <Thead>
                <Tr>
                  <Th>OS</Th>
                  <Th>Tier</Th>
                  <Th>VMs</Th>
                </Tr>
              </Thead>
              <Tbody>
                {vm.showNoResults ? (
                  <Tr>
                    <Td colSpan={3}>
                      <EmptySearchResults title="No matching operating system found" />
                    </Td>
                  </Tr>
                ) : (
                  vm.filteredRows.map((row) => (
                    <Tr key={row.osName}>
                      <Td dataLabel="OS">
                        <OsNameCell
                          osName={row.osName}
                          upgradeRecommendation={row.upgradeRecommendation}
                        />
                      </Td>
                      <Td dataLabel="Tier">
                        <SupportTierBadge tier={row.tier} />
                      </Td>
                      <Td dataLabel="VMs">{row.count}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </div>
        </StackItem>
      </Stack>
    </>
  );
};
