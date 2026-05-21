import {
  Content,
  EmptyState,
  EmptyStateBody,
  PageSection,
} from "@patternfly/react-core";
import type React from "react";

export const GroupsPage: React.FC = () => {
  return (
    <PageSection hasBodyWrapper={false}>
      <EmptyState titleText="Groups" headingLevel="h2" variant="full">
        <EmptyStateBody>
          <Content component="p">
            Group management will be available here soon.
          </Content>
        </EmptyStateBody>
      </EmptyState>
    </PageSection>
  );
};

GroupsPage.displayName = "GroupsPage";
