import { css } from "@emotion/css";
import type {
  ClusterFeatures,
  InventoryData,
} from "@openshift-migration-advisor/agent-sdk";
import { Content, Flex, FlexItem, Icon } from "@patternfly/react-core";
import { CheckCircleIcon, TimesCircleIcon } from "@patternfly/react-icons";
import type React from "react";
import { useMemo } from "react";

export type ClusterFeaturesEntry = {
  clusterName: string;
  features: ClusterFeatures;
};

const clusterBlockSpacing = css`
  &:not(:last-child) {
    margin-bottom: var(--pf-t--global--spacer--lg);
  }
`;

const itemLabel = css`
  font-weight: var(--pf-t--global--font--weight--body--bold);
  margin-bottom: var(--pf-t--global--spacer--xs);
`;

const clusterNameLabel = css`
  display: block;
  margin-bottom: 4px;
`;

const drsColumns = css`
  margin-top: var(--pf-t--global--spacer--sm);
`;

const DRS_MODE_LABELS: Record<string, string> = {
  fullyAutomated: "Fully Automated",
  partiallyAutomated: "Partially Automated",
  manual: "Manual",
  none: "None",
  "Fully Automated": "Fully Automated",
  "Partially Automated": "Partially Automated",
  Manual: "Manual",
  None: "None",
};

export const formatDrsMode = (mode?: string): string => {
  if (!mode || mode.trim().length === 0) return "-";
  return DRS_MODE_LABELS[mode] ?? mode;
};

export const extractClusterFeaturesEntries = (clusters?: {
  [key: string]: InventoryData;
}): ClusterFeaturesEntry[] => {
  if (!clusters) return [];

  return Object.entries(clusters)
    .map(([clusterName, data]) => {
      const features = data.clusterFeatures;
      if (!features) return null;

      const hasData =
        typeof features.drsEnabled === "boolean" ||
        typeof features.storageDrsEnabled === "boolean" ||
        (typeof features.drsMode === "string" &&
          features.drsMode.trim().length > 0);

      return hasData ? { clusterName, features } : null;
    })
    .filter((entry): entry is ClusterFeaturesEntry => entry !== null)
    .sort((a, b) => a.clusterName.localeCompare(b.clusterName));
};

interface ClusterDrsConfigurationProps {
  clusters?: { [key: string]: InventoryData };
  selectedClusterId?: string;
}

const EnabledStatus: React.FC<{ enabled?: boolean }> = ({ enabled }) => {
  if (enabled === true) {
    return (
      <Flex
        gap={{ default: "gapSm" }}
        alignItems={{ default: "alignItemsCenter" }}
      >
        <Icon status="success" isInline size="sm">
          <CheckCircleIcon />
        </Icon>
        <span>Enabled</span>
      </Flex>
    );
  }
  if (enabled === false) {
    return (
      <Flex
        gap={{ default: "gapSm" }}
        alignItems={{ default: "alignItemsCenter" }}
      >
        <Icon status="danger" isInline size="sm">
          <TimesCircleIcon />
        </Icon>
        <span>Disabled</span>
      </Flex>
    );
  }
  return (
    <Flex
      gap={{ default: "gapSm" }}
      alignItems={{ default: "alignItemsCenter" }}
    >
      <span>–</span>
    </Flex>
  );
};

const ClusterDrsBlock: React.FC<{
  features: ClusterFeatures;
  clusterName?: string;
}> = ({ features, clusterName }) => (
  <Content component="p" className={clusterBlockSpacing}>
    {clusterName ? (
      <strong className={clusterNameLabel}>{clusterName}</strong>
    ) : null}
    <strong>Cluster DRS Configuration</strong>
    <Flex gap={{ default: "gapLg" }} wrap="wrap" className={drsColumns}>
      <FlexItem>
        <div className={itemLabel}>DRS Status</div>
        <EnabledStatus enabled={features.drsEnabled} />
      </FlexItem>
      <FlexItem>
        <div className={itemLabel}>DRS Mode</div>
        <span>{formatDrsMode(features.drsMode)}</span>
      </FlexItem>
      <FlexItem>
        <div className={itemLabel}>Storage DRS Status</div>
        <EnabledStatus enabled={features.storageDrsEnabled} />
      </FlexItem>
    </Flex>
  </Content>
);

export const ClusterDrsConfiguration: React.FC<
  ClusterDrsConfigurationProps
> = ({ clusters, selectedClusterId = "all" }) => {
  const entries = useMemo(
    () => extractClusterFeaturesEntries(clusters),
    [clusters],
  );

  const visibleEntries = useMemo(() => {
    if (selectedClusterId === "all") return [];
    return entries.filter((e) => e.clusterName === selectedClusterId);
  }, [entries, selectedClusterId]);

  if (selectedClusterId === "all" || visibleEntries.length === 0) {
    return null;
  }

  const showNames = visibleEntries.length > 1;

  return (
    <section
      id="cluster-drs-configuration"
      aria-label="Cluster DRS configuration"
    >
      {visibleEntries.map((entry) => (
        <ClusterDrsBlock
          key={entry.clusterName}
          features={entry.features}
          clusterName={showNames ? entry.clusterName : undefined}
        />
      ))}
    </section>
  );
};

ClusterDrsConfiguration.displayName = "ClusterDrsConfiguration";
