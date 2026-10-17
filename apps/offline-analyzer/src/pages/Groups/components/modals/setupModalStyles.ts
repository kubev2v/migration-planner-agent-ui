import { css } from "@emotion/css";

export const setupModalStyles = {
  section: css`
    border: 1px solid var(--pf-t--global--border--color--default);
    border-radius: var(--pf-t--global--border--radius--small);
    overflow: hidden;
  `,
  sectionLocked: css`
    border: 1px solid var(--pf-t--global--border--color--default);
    border-radius: var(--pf-t--global--border--radius--small);
    margin-bottom: 16px;
    overflow: hidden;
    background: var(--pf-t--global--background--color--disabled--default);
    opacity: 0.75;
  `,
  sectionHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    cursor: pointer;
    background: transparent;
    border: none;
    width: 100%;
    text-align: left;
    gap: 12px;

    &:hover:not(:disabled) {
      background: var(--pf-t--global--background--color--secondary--default);
    }

    &:disabled {
      cursor: not-allowed;
    }
  `,
  sectionHeaderLeft: css`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  `,
  sectionHeaderRight: css`
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  `,
  sectionTitle: css`
    display: flex;
    flex-direction: column;
  `,
  sectionBody: css`
    padding: 0 20px 20px 20px;
  `,
  statusSuccess: css`
    color: var(--pf-t--global--icon--color--status--success--default);
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  statusPending: css`
    color: var(--pf-t--global--text--color--subtle);
    display: flex;
    align-items: center;
    gap: 6px;
  `,
};
