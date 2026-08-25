import {
  Alert,
  AlertActionCloseButton,
  Content,
  PageSection,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useReportsContext } from "../../common/report/ReportsContext";
import { agentApiSlice } from "../../store/api/agentApiSlice";
import {
  useCompareCollectionsQuery,
  useExportCollectionMutation,
  useListCollectionsQuery,
} from "../../store/api/comparisonEndpoints";
import { getSdkErrorMessage } from "../../store/baseQuery";
import { useAppDispatch } from "../../store/hooks";
import { downloadExportBlob } from "../VirtualMachinesOverview/components/Export/downloadExportBlob";
import { pickDefaultComparisonIds } from "./comparisonSelection";
import { ReportComparisonEmptyState } from "./ReportComparisonEmptyState";
import { ReportComparisonHeader } from "./ReportComparisonHeader";
import { ReportComparisonView } from "./ReportComparisonView";

export const ReportComparisonPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { onCompleted } = useReportsContext();
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [defaultsAppliedFor, setDefaultsAppliedFor] = useState<string | null>(
    null,
  );
  const [exportError, setExportError] = useState<string | null>(null);

  // --- Server data (RTK Query) ---------------------------------------------
  const {
    data: collections = [],
    isLoading: loading,
    error: collectionQueryError,
  } = useListCollectionsQuery();
  const collectionError = collectionQueryError
    ? getSdkErrorMessage(
        collectionQueryError,
        "Failed to load report collections.",
      )
    : null;

  const canCompare = collections.length >= 2;
  const newestCollectionId = collections[0]?.id;

  // Apply the default from/to selection on first load and whenever a newer
  // collection appears (a completed report), matching the previous behaviour of
  // resetting to the newest pair — without any imperative reload.
  useEffect(() => {
    if (!canCompare || !newestCollectionId) {
      return;
    }
    if (defaultsAppliedFor === newestCollectionId) {
      return;
    }
    const defaults = pickDefaultComparisonIds(collections);
    if (defaults) {
      setFromId(defaults.fromId);
      setToId(defaults.toId);
    }
    setDefaultsAppliedFor(newestCollectionId);
  }, [canCompare, collections, defaultsAppliedFor, newestCollectionId]);

  const comparisonReady =
    canCompare && Boolean(fromId) && Boolean(toId) && fromId !== toId;
  const {
    data: comparison,
    isFetching: comparisonLoading,
    error: comparisonQueryError,
  } = useCompareCollectionsQuery(
    { aId: fromId, bId: toId },
    { skip: !comparisonReady },
  );
  const comparisonError = comparisonQueryError
    ? getSdkErrorMessage(
        comparisonQueryError,
        "Failed to load report comparison.",
      )
    : null;

  // A completed report refreshes the collection list and every comparison entry.
  const handleReportRefreshCompleted = useCallback(async () => {
    dispatch(agentApiSlice.util.invalidateTags(["Collections"]));
  }, [dispatch]);

  useEffect(() => {
    return onCompleted(handleReportRefreshCompleted);
  }, [onCompleted, handleReportRefreshCompleted]);

  const headerDescription = useMemo(() => {
    if (!canCompare) {
      return null;
    }
    return (
      <>
        Compare migration metrics between 2 reports for{" "}
        <strong>All clusters</strong>. Excluded virtual machines will not be
        included in the comparison.
      </>
    );
  }, [canCompare]);

  const [exportCollection, { isLoading: isExporting }] =
    useExportCollectionMutation();

  const handleExportComparison = useCallback(async () => {
    if (!toId) {
      return;
    }

    setExportError(null);
    try {
      const blob = await exportCollection({
        id: toId,
        scope: "overview",
      }).unwrap();
      downloadExportBlob(blob, `report-comparison-${toId}.zip`);
    } catch (err) {
      console.error("Error exporting comparison:", err);
      setExportError(
        getSdkErrorMessage(
          err,
          "Failed to export comparison. Please try again.",
        ),
      );
    }
  }, [exportCollection, toId]);

  if (loading) {
    return (
      <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
        <Content component="p">Loading report comparison...</Content>
      </PageSection>
    );
  }

  return (
    <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
      <Stack hasGutter>
        <StackItem>
          <ReportComparisonHeader
            showExport={canCompare}
            onExportClick={handleExportComparison}
            isExporting={isExporting}
            description={headerDescription}
          />
        </StackItem>

        {exportError ? (
          <StackItem>
            <Alert
              variant="danger"
              isInline
              title="Export failed"
              actionClose={
                <AlertActionCloseButton onClose={() => setExportError(null)} />
              }
            >
              {exportError}
            </Alert>
          </StackItem>
        ) : null}

        {collectionError ? (
          <StackItem>
            <Alert variant="danger" isInline title="Error loading reports">
              {collectionError}
            </Alert>
          </StackItem>
        ) : null}

        {comparisonError ? (
          <StackItem>
            <Alert variant="danger" isInline title="Error loading comparison">
              {comparisonError}
            </Alert>
          </StackItem>
        ) : null}

        {!canCompare ? (
          <StackItem>
            <ReportComparisonEmptyState reportCount={collections.length} />
          </StackItem>
        ) : null}

        {canCompare && comparison && !comparisonLoading ? (
          <StackItem>
            <ReportComparisonView
              collections={collections}
              comparison={comparison}
              fromId={fromId}
              toId={toId}
              onFromChange={setFromId}
              onToChange={setToId}
            />
          </StackItem>
        ) : null}

        {canCompare && comparisonLoading ? (
          <StackItem>
            <Content component="p">Loading comparison data...</Content>
          </StackItem>
        ) : null}
      </Stack>
    </PageSection>
  );
};

ReportComparisonPage.displayName = "ReportComparisonPage";
