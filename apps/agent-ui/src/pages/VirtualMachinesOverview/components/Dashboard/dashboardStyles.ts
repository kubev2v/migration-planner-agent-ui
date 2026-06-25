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

  container: css`
    .pf-v6-c-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      border-radius: 10px;
    }
  `,

  card: css`
    border-radius: 10px;
    min-height: 430px;
    max-height: 520px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  `,

  cardPrint: css`
    border: 1px solid #d2d2d2 !important;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    min-height: unset;
    max-height: unset;
    page-break-inside: avoid;
  `,

  storageCardOverflowHidden: css`
    overflow: hidden;
  `,

  storageCardOverflowVisible: css`
    overflow: visible;
  `,

  storageChartWrapper: css`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    padding: 20px 0;
  `,

  storageExportSectionMargin: css`
    margin-bottom: 24px;
  `,

  storageExportSectionTitle: css`
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
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
};
