import { Button, Flex, FlexItem } from "@patternfly/react-core";
import { CopyIcon } from "@patternfly/react-icons";
import type { FC } from "react";

export interface RecommendationToolActionsProps {
  isReadOnly: boolean;
  isEditDisabled: boolean;
  onEdit: () => void;
  canCopy: boolean;
  onCopy: () => void;
}

export const RecommendationToolActions: FC<RecommendationToolActionsProps> = ({
  isReadOnly,
  isEditDisabled,
  onEdit,
  canCopy,
  onCopy,
}) => (
  <Flex gap={{ default: "gapMd" }} flexWrap={{ default: "wrap" }}>
    {!isReadOnly ? (
      <FlexItem>
        <Button
          variant="secondary"
          onClick={onEdit}
          isDisabled={isEditDisabled}
        >
          Edit migration preferences
        </Button>
      </FlexItem>
    ) : null}
    {canCopy ? (
      <FlexItem>
        <Button
          variant="link"
          icon={<CopyIcon />}
          iconPosition="end"
          onClick={onCopy}
        >
          Copy as plain text
        </Button>
      </FlexItem>
    ) : null}
  </Flex>
);

RecommendationToolActions.displayName = "RecommendationToolActions";
