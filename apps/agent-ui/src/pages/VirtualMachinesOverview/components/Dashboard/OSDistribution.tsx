import { css } from "@emotion/css";
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Icon,
  MenuToggle,
  type MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { DesktopIcon, InfoCircleIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { CardEmptyState } from "./CardEmptyState";
import { REPORT_CARD_EMPTY_STATE_TITLES } from "./constants";
import { dashboardStyles } from "./dashboardStyles";
import { EmptySearchResults } from "./EmptySearchResults";
import { OsSupportTiersHelpPopover } from "./OsSupportTiersHelpPopover";
import {
  getSupportTierLegendLabel,
  ORDERED_SUPPORT_TIERS,
  type OSDistributionEntry,
} from "./osSupportTier";
import { SupportTierBadge } from "./SupportTierBadge";
import {
  ALL_TIERS_FILTER,
  useOsBarChartViewModel,
} from "./useOsBarChartViewModel";

const filterToolbarStyle = css`
  padding-left: 0;
  padding-right: 0;
`;

const filterItemStyle = css`
  flex: 1 1 0;
  min-width: 0;
`;

const vmsColumnStyle = css`
  text-align: right;
`;

const tableScrollStyle = css`
  overflow: auto;
`;

interface OSDistributionProps {
  osData: Record<string, OSDistributionEntry>;
  isExportMode?: boolean;
}

export const OSDistribution: React.FC<OSDistributionProps> = ({
  osData,
  isExportMode = false,
}) => {
  const hasUpgradeRecommendation = Object.values(osData).some(
    (o) => o.upgradeRecommendation && o.upgradeRecommendation.trim() !== "",
  );

  return (
    <Card
      className={
        isExportMode ? dashboardStyles.cardPrint : dashboardStyles.card
      }
      id="os-distribution"
    >
      <CardTitle>
        <Flex
          alignItems={{ default: "alignItemsCenter" }}
          spaceItems={{ default: "spaceItemsSm" }}
        >
          <FlexItem>
            <DesktopIcon /> Operating Systems
          </FlexItem>
          <FlexItem>
            <OsSupportTiersHelpPopover />
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        {hasUpgradeRecommendation ? (
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            spaceItems={{ default: "spaceItemsSm" }}
            style={{ marginBottom: "8px" }}
          >
            <FlexItem>
              <Icon status="info">
                <InfoCircleIcon />
              </Icon>
            </FlexItem>
            <FlexItem>
              <Content component="p" style={{ fontWeight: 500 }}>
                Some operating systems may need upgrades before migration
              </Content>
            </FlexItem>
          </Flex>
        ) : null}
        <OSBarChart osData={osData} isExportMode={isExportMode} />
      </CardBody>
    </Card>
  );
};

interface OSBarChartProps {
  osData: Record<string, OSDistributionEntry>;
  isExportMode?: boolean;
}

export const OSBarChart: React.FC<OSBarChartProps> = ({
  osData,
  isExportMode = false,
}) => {
  const vm = useOsBarChartViewModel(osData);

  if (vm.tableRows.length === 0) {
    return (
      <CardEmptyState title={REPORT_CARD_EMPTY_STATE_TITLES.operatingSystems} />
    );
  }

  return (
    <>
      {!isExportMode ? (
        <Toolbar className={filterToolbarStyle}>
          <ToolbarContent>
            <ToolbarItem className={filterItemStyle}>
              <SearchInput
                placeholder="Filter by OS"
                value={vm.osFilter}
                onChange={(_event, value) => vm.setOsFilter(value)}
                onClear={vm.clearOsFilter}
                aria-label="Filter operating systems by name"
              />
            </ToolbarItem>
            <ToolbarItem className={filterItemStyle}>
              <Select
                isOpen={vm.isTierSelectOpen}
                selected={vm.tierFilter}
                onSelect={vm.handleTierSelect}
                onOpenChange={vm.setIsTierSelectOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    isExpanded={vm.isTierSelectOpen}
                    onClick={vm.toggleTierSelectOpen}
                    style={{ width: "100%" }}
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
      ) : null}

      <div
        className={isExportMode ? undefined : tableScrollStyle}
        style={isExportMode ? undefined : { maxHeight: "350px" }}
      >
        <Table aria-label="Operating systems" variant="compact">
          <Thead>
            <Tr>
              <Th>OS</Th>
              <Th>Tier</Th>
              <Th className={vmsColumnStyle}>VMs</Th>
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
                  <Td dataLabel="OS">{row.osName}</Td>
                  <Td dataLabel="Tier">
                    <SupportTierBadge
                      tier={row.tier}
                      isExportMode={isExportMode}
                    />
                  </Td>
                  <Td dataLabel="VMs" className={vmsColumnStyle}>
                    {row.count}
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </div>
    </>
  );
};
