import { css } from "@emotion/css";

export const dashboardStyles = {
  cardClip: css`
    clip-path: inset(0 round 10px);
    background: #fff;
    height: 100%;
    width: 100%;
  `,

  cardScroll: css`
    height: 100%;
    min-height: 300px;
    max-height: 500px;
    overflow: auto;
    display: flex;
    flex-direction: column;
  `,

  equalHeightRow: css`
    display: flex;
    gap: var(--pf-t--global--spacer--gap--group--horizontal);
    align-items: stretch;
  `,

  equalHeight: css`
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    height: 100%;
  `,

  cardBodyScrollable: css`
    overflow: auto;
  `,

  // `!important` on overflow: PatternFly sets `.pf-v6-c-card { overflow: auto }`
  // at the same specificity, which wins in the production build due to stylesheet
  // injection order. `!important` forces `hidden` regardless of that order.
  card: css`
    min-height: 430px;
    max-height: 520px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden !important;
  `,

  storageCardOverflowHidden: css`
    overflow: hidden;
  `,

  storageChartWrapper: css`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    padding: 20px 0;
  `,

  storageFlexFullWidth: css`
    width: 100%;
  `,

  storageMenuToggleMinWidth: css`
    min-width: 200px;
  `,

  storageNoDataContainer: css`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 250px;
    font-size: 16px;
    color: #6a6e73;
  `,

  storageTotalsNote: css`
    margin-top: 12px;
    color: #6a6e73;
    font-style: italic;
    text-align: center;
  `,

  clustersTitleRow: css`
    width: 100%;
  `,

  clustersCardSubtitle: css`
    color: var(--pf-t--global--text--color--subtle);
    font-size: 0.85rem;
  `,

  clustersMenuToggleMinWidth: css`
    min-width: 250px;
  `,

  cpuOvercommitBoxes: css`
    display: flex;
    justify-content: center;
    gap: 12px;
    margin: 124px 0 16px;
    flex-wrap: wrap;

    @media (max-width: 1200px) {
      margin: 72px 0 12px;
      gap: 20px;
    }

    @media (max-width: 768px) {
      margin: 40px 0 8px;
      gap: 16px;
    }
  `,

  cpuOvercommitBox: css`
    color: #000;
    min-width: 120px;
    height: 64px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    padding: 0 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

    @media (max-width: 768px) {
      min-width: 96px;
      height: 56px;
      font-size: 18px;
      padding: 0 12px;
      border-radius: 10px;
    }

    @media (max-width: 480px) {
      min-width: 88px;
      height: 48px;
      font-size: 16px;
      border-radius: 8px;
    }
  `,

  cpuOvercommitLegend: css`
    display: flex;
    justify-content: center;
    gap: 6px 24px;
    flex-wrap: wrap;
    margin-top: 20%;

    @media (max-width: 1200px) {
      margin-top: 20%;
      gap: 6px 20px;
    }

    @media (max-width: 768px) {
      margin-top: 20%;
      gap: 6px 16px;
    }
  `,

  cpuOvercommitLegendItem: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,

  cpuOvercommitLegendSwatch: css`
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;

    @media (max-width: 768px) {
      width: 10px;
      height: 10px;
    }
  `,

  cpuOvercommitLegendText: css`
    font-size: 16px;

    @media (max-width: 768px) {
      font-size: 16px;
    }

    @media (max-width: 480px) {
      font-size: 14px;
    }
  `,
};

export const tableFullWidthStyle = css`
  margin-inline: calc(-1 * var(--pf-v6-c-card--child--PaddingInlineStart));
  width: calc(
    100% + var(--pf-v6-c-card--child--PaddingInlineStart) +
      var(--pf-v6-c-card--child--PaddingInlineEnd)
  );
`;
