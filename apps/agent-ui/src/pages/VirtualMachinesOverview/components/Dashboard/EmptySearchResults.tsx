import type React from "react";
import { DashboardEmptyStateBase } from "./DashboardEmptyStateBase";

export interface EmptySearchResultsProps {
  title?: string;
  body?: string;
}

export const EmptySearchResults: React.FC<EmptySearchResultsProps> = ({
  title = "No results found",
  body = "To continue, adjust your search or filters and try again",
}) => <DashboardEmptyStateBase title={title} body={body} />;

EmptySearchResults.displayName = "EmptySearchResults";
