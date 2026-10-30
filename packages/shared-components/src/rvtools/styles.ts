import { css } from "@emotion/css";

export const dropzoneStyle = css`
  border: 1px dashed var(--pf-t--global--border--color--100);
  border-radius: var(--pf-t--global--border--radius--small);
  padding: var(--pf-t--global--spacer--lg);
  display: flex;
  align-items: center;
  gap: var(--pf-t--global--spacer--md);
  background: var(--pf-t--global--background--color--secondary--default);
`;

export const dropzoneIntroStyle = css`
  color: var(--pf-t--global--text--color--subtle);
  margin-bottom: var(--pf-t--global--spacer--md);
`;

export const dropzoneTextStyle = css`
  flex: 1;
  color: var(--pf-t--global--text--color--subtle);
`;

export const stagedFilesPanelStyle = css`
  margin-top: var(--pf-t--global--spacer--md);
`;

export const stagedFilesToolbarToggleStyle = css`
  display: inline-flex;
  align-items: center;
  gap: var(--pf-t--global--spacer--sm);
  font-weight: var(--pf-t--global--font--weight--body--bold);
`;

export const stagedFilesToolbarIconStyle = css`
  color: var(--pf-t--global--icon--color--brand--default);
`;

export const stagedFilesListStyle = css`
  display: flex;
  flex-direction: column;
  gap: var(--pf-t--global--spacer--md);
  margin-top: var(--pf-t--global--spacer--sm);
`;

export const stagedFileRowStyle = css`
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  column-gap: var(--pf-t--global--spacer--sm);
  row-gap: var(--pf-t--global--spacer--xs);
  align-items: center;
  padding-bottom: var(--pf-t--global--spacer--sm);
  border-bottom: 1px solid var(--pf-t--global--border--color--default);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

export const stagedFileMetaStyle = css`
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--pf-t--global--spacer--sm);
`;

export const stagedFileNameStyle = css`
  min-width: 0;
  flex: 1;
`;

export const stagedFileProgressStyle = css`
  grid-column: 1 / -1;
  grid-row: 2;
`;

export const stagedFileActionsStyle = css`
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: var(--pf-t--global--spacer--sm);
`;

export const stagedFilePercentStyle = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: var(--pf-t--global--font--size--sm);
`;

export const stagedFileCompleteIconStyle = css`
  color: var(--pf-t--global--icon--color--status--success--default);
`;

export const reviewTableStyle = css`
  margin-top: var(--pf-t--global--spacer--md);
`;

export const reviewTableActionsStyle = css`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--pf-t--global--spacer--md);
  white-space: nowrap;
  min-width: 7.5rem;
`;

export const hiddenInputStyle = css`
  display: none;
`;
