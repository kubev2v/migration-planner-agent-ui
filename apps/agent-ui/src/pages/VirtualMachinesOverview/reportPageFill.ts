import { css } from "@emotion/css";

/**
 * PatternFly Page/Stack already fill leftover viewport (`isContentFilled` +
 * `isFilled` + Stack `height: 100%`). Flex items default to `min-height: auto`,
 * so the table still grows the page unless that minimum is cleared.
 */
export const reportPageFillStyles = {
  pageSection: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  `,
  stack: css`
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
  `,
  tabsHost: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;

    > .pf-v6-c-tab-content {
      flex: 1 1 0;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }
  `,
  tabBodyScroll: css`
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    padding-block-start: var(--pf-t--global--spacer--md);
  `,
  tabBodyFill: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding-block-start: var(--pf-t--global--spacer--lg);
  `,
};
