import { Button } from "@patternfly/react-core";
import { ExportIcon } from "@patternfly/react-icons";
import type React from "react";

interface ExportButtonProps {
  onClick?: () => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onClick }) => {
  return (
    <Button variant="link" onClick={onClick} icon={<ExportIcon />}>
      Export
    </Button>
  );
};

ExportButton.displayName = "ExportButton";
