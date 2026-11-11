import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { AngleLeftIcon } from "@patternfly/react-icons";
import type { FC, ReactNode } from "react";

export interface ToolLayoutProps {
  title: string;
  help?: ReactNode;
  description?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export const ToolLayout: FC<ToolLayoutProps> = ({
  title,
  help,
  description,
  onBack,
  backLabel = "Back to recommendation tools",
  actions,
  children,
}) => {
  return (
    <Stack hasGutter>
      {onBack && (
        <StackItem>
          <Button
            variant="link"
            isInline
            icon={<AngleLeftIcon />}
            onClick={onBack}
          >
            {backLabel}
          </Button>
        </StackItem>
      )}

      <StackItem>
        <Flex
          alignItems={{ default: "alignItemsFlexStart" }}
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          flexWrap={{ default: "wrap" }}
          gap={{ default: "gapMd" }}
        >
          <FlexItem>
            <Flex
              alignItems={{ default: "alignItemsCenter" }}
              flexWrap={{ default: "nowrap" }}
              gap={{ default: "gapSm" }}
            >
              <FlexItem>
                <Content component={ContentVariants.h2}>{title}</Content>
              </FlexItem>
              {help ? <FlexItem>{help}</FlexItem> : null}
            </Flex>

            {description && (
              <Content component={ContentVariants.p}>{description}</Content>
            )}
          </FlexItem>
          {actions && <FlexItem>{actions}</FlexItem>}
        </Flex>
      </StackItem>

      <StackItem>{children}</StackItem>
    </Stack>
  );
};

ToolLayout.displayName = "ToolLayout";
