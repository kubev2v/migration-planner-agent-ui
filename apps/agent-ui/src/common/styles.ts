import { css } from "@emotion/css";

export const commonStyles = {
  tableFullWidth: css`
    margin-inline: calc(
      -1 * var(--pf-v6-c-card--child--PaddingInlineStart)
    );
    width: calc(
      100% + var(--pf-v6-c-card--child--PaddingInlineStart) +
        var(--pf-v6-c-card--child--PaddingInlineEnd)
    );
  `,
};
