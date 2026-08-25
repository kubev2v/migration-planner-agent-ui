import { css } from "@emotion/css";
import {
  Alert,
  Badge,
  Button,
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Spinner,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { AngleDownIcon, AngleRightIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useState } from "react";
import { AppEmptyState } from "../../common/components";
import { useGetComparisonDiffQuery } from "../../store/api/comparisonEndpoints";
import { getSdkErrorMessage } from "../../store/baseQuery";
import { formatDelta, formatReportRunShortDate } from "./comparisonFormatting";
import {
  COMPARISON_METRICS,
  type ComparisonMetricKey,
} from "./comparisonMetrics";

const drawerPanelStyle = css`
  min-width: 720px;
`;

const subtitleStyle = css`
  color: var(--pf-t--global--text--color--subtle);
  margin-top: var(--pf-t--global--spacer--xs);
`;

const changeHeaderStyle = css`
  text-align: right;
`;

const changeCellStyle = css`
  text-align: right;
  vertical-align: middle;
`;

const changeHighlightStyle = css`
  text-decoration: underline dotted;
`;

const collapsibleMetricToggleStyle = css`
  && {
    display: inline-flex;
    align-items: center;
    gap: var(--pf-t--global--spacer--sm);
    padding: 0;
    color: var(--pf-t--global--text--color--regular);
    font-weight: var(--pf-t--global--font--weight--body--default);

    &:hover,
    &:focus-visible {
      color: var(--pf-t--global--text--color--regular);
      background-color: transparent;
    }
  }
`;

const nestedTableStyle = css`
  margin-top: var(--pf-t--global--spacer--sm);
`;

const truncationNoticeStyle = css`
  color: var(--pf-t--global--text--color--subtle);
  margin-top: var(--pf-t--global--spacer--sm);
`;

type VmDrawerRow = {
  id: string;
  name: string;
  labels: string[];
  collectionDate: Date;
  side: "onlyInB" | "onlyInA";
};

type DrawerSection = "onlyInB" | "onlyInA";

interface ComparisonDetailsDrawerProps {
  aId: string;
  bId: string;
  aDate: Date;
  bDate: Date;
  metricKey: ComparisonMetricKey;
  delta: number;
  onClose: () => void;
}

function renderChangeValue(value: string, highlight = false) {
  if (highlight) {
    return <span className={changeHighlightStyle}>{value}</span>;
  }
  return value;
}

export const ComparisonDetailsDrawer: React.FC<
  ComparisonDetailsDrawerProps
> = ({ aId, bId, aDate, bDate, metricKey, delta, onClose }) => {
  const metric = COMPARISON_METRICS.find((item) => item.key === metricKey);
  const dimension = metric?.dimension;
  const [expandedSection, setExpandedSection] = useState<DrawerSection | null>(
    null,
  );

  // The diff and its resolved VM rows come from a single cache entry; the drawer
  // itself keeps no server state.
  const {
    data,
    isFetching: loading,
    error: queryError,
  } = useGetComparisonDiffQuery(
    { aId, bId, dimension: dimension ?? "total" },
    { skip: !dimension },
  );
  const error = queryError
    ? getSdkErrorMessage(queryError, "Failed to load comparison details.")
    : null;
  const diff = data?.diff ?? null;
  const failedLookupCount = data?.failedCount ?? 0;

  const onlyInBRows: VmDrawerRow[] = (data?.onlyInB ?? []).map((vm) => ({
    ...vm,
    collectionDate: bDate,
    side: "onlyInB",
  }));
  const onlyInARows: VmDrawerRow[] = (data?.onlyInA ?? []).map((vm) => ({
    ...vm,
    collectionDate: aDate,
    side: "onlyInA",
  }));

  const toggleSection = (section: DrawerSection) => {
    setExpandedSection((current) => (current === section ? null : section));
  };

  const renderVmTable = (
    rows: VmDrawerRow[],
    badgeLabel: string,
    total: number,
  ) => {
    if (rows.length === 0) {
      if (total > 0) {
        return (
          <Content component="p" className={truncationNoticeStyle}>
            Showing 0 of {total}
          </Content>
        );
      }

      return (
        <Content component="p">No virtual machines in this category.</Content>
      );
    }

    const isTruncated = total > rows.length;

    return (
      <>
        <Table
          variant="compact"
          aria-label={`${badgeLabel} virtual machines`}
          className={nestedTableStyle}
        >
          <Thead>
            <Tr>
              <Th>VM name</Th>
              <Th>Labels</Th>
              <Th>Collection date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={`${row.side}-${row.id}`}>
                <Td>
                  {row.name} <Badge isRead>{badgeLabel}</Badge>
                </Td>
                <Td>{row.labels.length > 0 ? row.labels.join(", ") : "—"}</Td>
                <Td>{formatReportRunShortDate(row.collectionDate)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {isTruncated ? (
          <Content component="p" className={truncationNoticeStyle}>
            Showing {rows.length} of {total}
          </Content>
        ) : null}
      </>
    );
  };

  const renderCollapsibleMetricRow = (
    section: DrawerSection,
    label: string,
    change: string,
    rows: VmDrawerRow[],
    tableLabel: string,
    total: number,
  ) => {
    const isExpanded = expandedSection === section;
    const ChevronIcon = isExpanded ? AngleDownIcon : AngleRightIcon;

    return (
      <>
        <Tr>
          <Td>
            <Button
              variant="plain"
              className={collapsibleMetricToggleStyle}
              onClick={() => toggleSection(section)}
              aria-expanded={isExpanded}
            >
              <ChevronIcon aria-hidden />
              {label}
            </Button>
          </Td>
          <Td className={changeCellStyle}>
            {renderChangeValue(change, change !== "0")}
          </Td>
        </Tr>
        {isExpanded ? (
          <Tr>
            <Td colSpan={2}>{renderVmTable(rows, tableLabel, total)}</Td>
          </Tr>
        ) : null}
      </>
    );
  };

  return (
    <DrawerPanelContent
      className={drawerPanelStyle}
      widths={{
        default: "width_50",
        lg: "width_50",
        xl: "width_50",
      }}
    >
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          Details: {metric?.label ?? metricKey}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <Content component="p" className={subtitleStyle}>
          {formatReportRunShortDate(aDate)} → {formatReportRunShortDate(bDate)}{" "}
          · {formatDelta(delta)}
        </Content>

        {loading ? (
          <Spinner size="lg" aria-label="Loading comparison details" />
        ) : null}

        {error ? (
          <AppEmptyState
            titleText="Unable to load comparison details"
            body={error}
            wrapInBullseye={false}
          />
        ) : null}

        {!loading && !error && diff ? (
          <Stack hasGutter style={{ marginTop: "16px" }}>
            {failedLookupCount > 0 ? (
              <StackItem>
                <Alert
                  variant="warning"
                  isInline
                  title="Some virtual machine details could not be loaded"
                >
                  {failedLookupCount} virtual machine
                  {failedLookupCount === 1 ? "" : "s"} could not be retrieved.
                  The counts above still reflect the full comparison totals.
                </Alert>
              </StackItem>
            ) : null}
            <StackItem>
              <Table variant="compact" aria-label="Comparison breakdown">
                <Thead>
                  <Tr>
                    <Th>Metric</Th>
                    <Th className={changeHeaderStyle}>Change</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {renderCollapsibleMetricRow(
                    "onlyInB",
                    "Net new VM",
                    formatDelta(diff.onlyInB.total),
                    onlyInBRows,
                    "New",
                    diff.onlyInB.total,
                  )}
                  {diff.onlyInA.total > 0
                    ? renderCollapsibleMetricRow(
                        "onlyInA",
                        "Removed VM",
                        formatDelta(-diff.onlyInA.total),
                        onlyInARows,
                        "Removed",
                        diff.onlyInA.total,
                      )
                    : null}
                </Tbody>
              </Table>
            </StackItem>
          </Stack>
        ) : null}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

ComparisonDetailsDrawer.displayName = "ComparisonDetailsDrawer";
