import { css } from "@emotion/css";

export const clustersOverviewStyles = {
  titleRow: css`
    width: 100%;
  `,

  cardSubtitle: css`
    color: var(--pf-t--global--text--color--subtle);
    font-size: 0.85rem;
  `,

  menuToggleMinWidth: css`
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
