import { Button, Label, LabelGroup } from "@patternfly/react-core";
import type React from "react";
import { useState } from "react";

const MAX_VISIBLE_LABELS = 5;

interface GroupLabelsCellProps {
  labels: string[];
}

export const GroupLabelsCell: React.FC<GroupLabelsCellProps> = ({ labels }) => {
  const [showAll, setShowAll] = useState(false);

  if (labels.length === 0) {
    return <>—</>;
  }

  const visibleLabels = showAll ? labels : labels.slice(0, MAX_VISIBLE_LABELS);
  const hiddenCount = labels.length - MAX_VISIBLE_LABELS;

  return (
    <div>
      <LabelGroup
        numLabels={showAll ? visibleLabels.length : MAX_VISIBLE_LABELS}
      >
        {visibleLabels.map((label) => (
          <Label key={label} isCompact>
            {label}
          </Label>
        ))}
      </LabelGroup>
      {!showAll && hiddenCount > 0 && (
        <div style={{ marginTop: "4px" }}>
          <Button variant="link" isInline onClick={() => setShowAll(true)}>
            + {hiddenCount} more
          </Button>
        </div>
      )}
    </div>
  );
};

GroupLabelsCell.displayName = "GroupLabelsCell";
