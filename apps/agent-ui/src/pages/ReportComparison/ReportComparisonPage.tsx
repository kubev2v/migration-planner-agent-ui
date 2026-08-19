import type { CollectionComparisonSummary } from "@openshift-migration-advisor/agent-sdk";
import { useInjection } from "@openshift-migration-advisor/ioc";
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
import type { DefaultApiInterface } from "../../api/agentApi";
import { listCollectionsNewestFirst } from "../../api/collectionApi";
import { fetchCollectionComparison } from "../../api/collectionComparisonApi";
import { useReportsContext } from "../../common/report/ReportsContext";
import { Symbols } from "../../main/Symbols";
import { downloadExportBlob } from "../VirtualMachinesOverview/components/Export/downloadExportBlob";
import { pickDefaultComparisonIds } from "./comparisonSelection";
import { ReportComparisonEmptyState } from "./ReportComparisonEmptyState";
import { ReportComparisonHeader } from "./ReportComparisonHeader";
import { ReportComparisonView } from "./ReportComparisonView";

export const ReportComparisonPage: React.FC = () => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const { onCompleted } = useReportsContext();
  const [collections, setCollections] = useState<
    Awaited<ReturnType<typeof listCollectionsNewestFirst>>
  >([]);
  const [comparison, setComparison] =
    useState<CollectionComparisonSummary | null>(null);
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const canCompare = collections.length >= 2;

  const reloadCollections = useCallback(async () => {
    const nextCollections = await listCollectionsNewestFirst(agentApi);
    setCollections(nextCollections);
    return nextCollections;
  }, [agentApi]);

  const handleReportRefreshCompleted = useCallback(async () => {
    const nextCollections = await reloadCollections();
    if (nextCollections.length >= 2) {
      const defaults = pickDefaultComparisonIds(nextCollections);
      if (defaults) {
        setFromId(defaults.fromId);
        setToId(defaults.toId);
      }
    }
  }, [reloadCollections]);

  useEffect(() => {
    return onCompleted(handleReportRefreshCompleted);
  }, [onCompleted, handleReportRefreshCompleted]);

  useEffect(() => {
    let cancelled = false;

    const loadCollections = async () => {
      setLoading(true);
      setCollectionError(null);
      try {
        const nextCollections = await reloadCollections();
        if (cancelled) {
          return;
        }
        if (nextCollections.length >= 2) {
          const defaults = pickDefaultComparisonIds(nextCollections);
          if (defaults) {
            setFromId(defaults.fromId);
            setToId(defaults.toId);
          }
        }
      } catch (err) {
        console.error("Error loading collections:", err);
        if (!cancelled) {
          setCollectionError(
            err instanceof Error
              ? err.message
              : "Failed to load report collections.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCollections();
    return () => {
      cancelled = true;
    };
  }, [reloadCollections]);

  useEffect(() => {
    if (!canCompare || !fromId || !toId || fromId === toId) {
      setComparison(null);
      return;
    }

    let cancelled = false;

    const loadComparison = async () => {
      setComparisonLoading(true);
      setComparisonError(null);
      try {
        const summary = await fetchCollectionComparison(agentApi, fromId, toId);
        if (!cancelled) {
          setComparison(summary);
        }
      } catch (err) {
        console.error("Error loading report comparison:", err);
        if (!cancelled) {
          setComparison(null);
          setComparisonError(
            err instanceof Error
              ? err.message
              : "Failed to load report comparison.",
          );
        }
      } finally {
        if (!cancelled) {
          setComparisonLoading(false);
        }
      }
    };

    void loadComparison();
    return () => {
      cancelled = true;
    };
  }, [agentApi, canCompare, fromId, toId]);

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

  const handleExportComparison = useCallback(async () => {
    if (!toId) {
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await agentApi.exportCollection({
        id: toId,
        scope: "overview",
      });
      downloadExportBlob(blob, `report-comparison-${toId}.zip`);
    } catch (err) {
      console.error("Error exporting comparison:", err);
      setExportError(
        err instanceof Error
          ? err.message
          : "Failed to export comparison. Please try again.",
      );
    } finally {
      setIsExporting(false);
    }
  }, [agentApi, toId]);

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
