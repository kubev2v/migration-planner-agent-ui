import { css } from "@emotion/css";
import type React from "react";
import { DashboardEmptyStateBase } from "./DashboardEmptyStateBase";

export const CARD_EMPTY_STATE_DESCRIPTION =
  "This data is not available for older inventories or certain imported reports.";

const cardEmptyStateContainer = css`
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  min-height: 250px;
`;

export interface CardEmptyStateProps {
  title: string;
  description?: string;
}

export const CardEmptyState: React.FC<CardEmptyStateProps> = ({
  title,
  description = CARD_EMPTY_STATE_DESCRIPTION,
}) => (
  <div className={cardEmptyStateContainer}>
    <DashboardEmptyStateBase title={title} body={description} />
  </div>
);

CardEmptyState.displayName = "CardEmptyState";
