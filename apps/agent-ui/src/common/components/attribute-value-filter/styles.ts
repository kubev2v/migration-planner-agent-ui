import { css } from "@emotion/css";

/**
 * Keeps filter chips and "Clear all filters" adjacent on the same row (PatternFly chip-container layout).
 * Apply to the parent PatternFly Toolbar that wraps AttributeValueFilter.
 */
export const attributeValueFilterToolbarStyle = css`
  & > [class*="toolbar__content"]:not(:first-of-type) {
    display: flex;
    flex-wrap: wrap;
    grid-row-gap: 0;
    align-items: baseline;

    & > [class*="toolbar__group"] {
      display: flex;
      flex-wrap: wrap;
      grid-row-gap: 0;
      align-items: center;
      width: auto;
      flex: 0 1 auto;
    }

    & > [class*="toolbar__group"] [class*="toolbar__item"] {
      margin-block-start: var(--pf-t--global--spacer--md, 0.5rem);
    }

    & > [class*="toolbar__group"]:last-child {
      flex: 0 0 auto;
      margin-inline-start: var(--pf-t--global--spacer--md, 0.5rem);
    }
  }
`;
