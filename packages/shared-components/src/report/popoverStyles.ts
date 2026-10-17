import { css } from "@emotion/css";

/** Keeps popover close (X) buttons readable on light popover headers. */
export const popoverPlainCloseButtonStyle = css`
  .pf-v6-c-popover__close .pf-v6-c-button.pf-m-plain,
  .pf-v6-c-popover__close .pf-v6-c-button.pf-m-plain:hover {
    color: var(--pf-t--global--text--color--regular);
  }
`;
