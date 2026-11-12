import { css } from "@emotion/css";
import { Grid, GridItem } from "@patternfly/react-core";
import type { FC, ReactNode } from "react";

import PopoverIcon from "../../../PopoverIcon.js";
import { formatNumber } from "./sizingFormatters.js";
import type { SizingFormValues } from "./sizingFormTypes.js";
import { getUtilizationComparisonData } from "./utilizationComparisonData.js";
import {
  formatUtilizationPercent,
  type UtilizationComparisonResponse,
} from "./utilizationSizing.js";

const cardsGridStyle = css`
  align-items: stretch;
`;

const cardStyle = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--pf-t--global--border--color--default);
  border-radius: var(--pf-t--global--border--radius--medium);
  overflow: hidden;
`;

const cardHeaderBaseStyle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--pf-t--global--spacer--200) var(--pf-t--global--spacer--300);
  font-size: var(--pf-t--global--font--size--xs);
  font-weight: var(--pf-t--global--font--weight--body--bold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const baselineHeaderStyle = css`
  ${cardHeaderBaseStyle};
  background-color: var(--pf-t--global--background--color--secondary--default);
  color: var(--pf-t--global--text--color--subtle);
`;

const optimizedHeaderStyle = css`
  ${cardHeaderBaseStyle};
  background-color: var(
    --pf-t--global--background--color--status--info--default
  );
  color: var(--pf-t--global--text--color--regular);
`;

const cardBodyStyle = css`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: var(--pf-t--global--spacer--400);
`;

const totalNodesStyle = css`
  font-size: var(--pf-t--global--font--size--4xl);
  font-weight: var(--pf-t--global--font--weight--body--bold);
  line-height: 1;
  margin-bottom: var(--pf-t--global--spacer--100);
`;

const totalNodesLabelStyle = css`
  font-size: var(--pf-t--global--font--size--sm);
  color: var(--pf-t--global--text--color--subtle);
  margin-bottom: var(--pf-t--global--spacer--400);
`;

const detailListStyle = css`
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
`;

const detailRowStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--pf-t--global--spacer--200);
  padding: var(--pf-t--global--spacer--200) 0;
  border-top: 1px solid var(--pf-t--global--border--color--default);
  font-size: var(--pf-t--global--font--size--sm);
`;

const detailLabelStyle = css`
  color: var(--pf-t--global--text--color--subtle);
`;

const detailValueStyle = css`
  font-weight: var(--pf-t--global--font--weight--body--bold);
  text-align: right;
`;

const savingsBannerStyle = css`
  margin-top: auto;
  padding: var(--pf-t--global--spacer--200) var(--pf-t--global--spacer--300);
  background-color: var(
    --pf-t--global--background--color--status--success--default
  );
  color: var(--pf-t--global--text--color--regular);
  font-size: var(--pf-t--global--font--size--sm);
  font-weight: var(--pf-t--global--font--weight--body--bold);
  border-top: 1px solid var(--pf-t--global--border--color--default);
`;

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

const DetailRow: FC<DetailRowProps> = ({ label, value }) => (
  <div className={detailRowStyle}>
    <span className={detailLabelStyle}>{label}</span>
    <span className={detailValueStyle}>{value}</span>
  </div>
);

interface UtilizationComparisonCardsProps {
  sizerOutput: UtilizationComparisonResponse;
  formValues: SizingFormValues;
}

export const UtilizationComparisonCards: FC<
  UtilizationComparisonCardsProps
> = ({ sizerOutput, formValues }) => {
  const { clusterSizing, optimizedSizing, savings, inventoryTotals } =
    sizerOutput;
  const {
    isSNO,
    cpuUtilization,
    memoryUtilization,
    effectiveCpu,
    effectiveMemory,
    savingsPercent,
  } = getUtilizationComparisonData({
    formValues,
    optimizedSizing,
    inventoryTotals,
    savings,
  });

  const formatEffectiveAmount = (
    amount: number,
    utilization: number | undefined,
    unit: string,
  ): string => {
    if (utilization == null) {
      return `${formatNumber(amount)} ${unit} (100% allocated)`;
    }
    return `${formatNumber(amount)} ${unit} (${formatUtilizationPercent(utilization)})`;
  };

  return (
    <Grid hasGutter className={cardsGridStyle}>
      <GridItem span={6}>
        <div className={cardStyle}>
          <div className={baselineHeaderStyle}>
            <span>100% allocation baseline</span>
            <PopoverIcon
              noVerticalAlign
              headerContent="100% allocation baseline"
              bodyContent="Sizing assumes VMs consume 100% of their allocated CPU and memory. This is the traditional conservative approach that does not account for actual usage patterns."
              buttonOuiaId="baseline-sizing-help"
            />
          </div>
          <div className={cardBodyStyle}>
            <div className={totalNodesStyle}>
              {formatNumber(clusterSizing.totalNodes)}
            </div>
            <div className={totalNodesLabelStyle}>Total nodes</div>
            <div className={detailListStyle}>
              {!isSNO && (
                <DetailRow
                  label="Worker nodes"
                  value={formatNumber(clusterSizing.workerNodes)}
                />
              )}
              <DetailRow
                label="Total CPU"
                value={`${formatNumber(clusterSizing.totalCPU)} cores`}
              />
              <DetailRow
                label="Total memory"
                value={`${formatNumber(clusterSizing.totalMemory)} GB`}
              />
              <DetailRow label="Utilization assumed" value="100%" />
              <DetailRow label="Data source" value="Static estimate" />
            </div>
          </div>
        </div>
      </GridItem>

      <GridItem span={6}>
        <div className={cardStyle}>
          <div className={optimizedHeaderStyle}>
            <span>Recommended: based on actual usage</span>
            <PopoverIcon
              noVerticalAlign
              headerContent="Recommended: based on actual usage"
              bodyContent="Sizing uses cluster utilization metrics from the last 30 days to estimate realistic resource demand. This can reduce the number of nodes required while maintaining adequate capacity."
              buttonOuiaId="optimized-sizing-help"
            />
          </div>
          <div className={cardBodyStyle}>
            <div className={totalNodesStyle}>
              {formatNumber(optimizedSizing.totalNodes)}
            </div>
            <div className={totalNodesLabelStyle}>Total nodes</div>
            <div className={detailListStyle}>
              {!isSNO && (
                <DetailRow
                  label="Worker nodes"
                  value={formatNumber(optimizedSizing.workerNodes)}
                />
              )}
              <DetailRow
                label="Effective CPU"
                value={formatEffectiveAmount(
                  effectiveCpu,
                  cpuUtilization,
                  "cores",
                )}
              />
              <DetailRow
                label="Effective memory"
                value={formatEffectiveAmount(
                  effectiveMemory,
                  memoryUtilization,
                  "GB",
                )}
              />
              <DetailRow
                label="Utilization (p95)"
                value={`CPU ${formatUtilizationPercent(cpuUtilization)}, Mem ${formatUtilizationPercent(memoryUtilization)}`}
              />
              <DetailRow
                label="Confidence"
                value={formatUtilizationPercent(optimizedSizing.confidence)}
              />
              <DetailRow
                label="Data source"
                value={savings.description || "Rightsizing metrics"}
              />
            </div>
          </div>
          <div className={savingsBannerStyle}>
            Potential infrastructure savings: {formatNumber(savings.nodesSaved)}{" "}
            nodes ({savingsPercent}%)
          </div>
        </div>
      </GridItem>
    </Grid>
  );
};

UtilizationComparisonCards.displayName = "UtilizationComparisonCards";
