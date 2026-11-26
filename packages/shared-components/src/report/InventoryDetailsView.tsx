import { css } from "@emotion/css";
import { Content, Stack, StackItem, Title } from "@patternfly/react-core";
import type { FC, ReactNode } from "react";

const pageDescription = css`
  color: var(--pf-t--global--text--color--subtle);
  max-width: 52rem;
  margin-top: var(--pf-t--global--spacer--sm);
`;

export interface InventoryDetailsViewProps {
  children: ReactNode;
}

export const InventoryDetailsView: FC<InventoryDetailsViewProps> = ({
  children,
}) => (
  <Stack hasGutter>
    <StackItem>
      <Title headingLevel="h2" size="2xl">
        Inventory details
      </Title>
      <Content className={pageDescription} component="p">
        Explore networks, datastores, and hosts in the selected scope. Expand a
        row to view configuration, hardware, and storage details.
      </Content>
    </StackItem>
    <StackItem>{children}</StackItem>
  </Stack>
);

InventoryDetailsView.displayName = "InventoryDetailsView";
