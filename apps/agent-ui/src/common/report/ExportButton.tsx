import { Button, Tooltip } from "@patternfly/react-core";
import { ExportIcon } from "@patternfly/react-icons";
import type React from "react";
import { useGetCredentialsQuery } from "../../store/api/credentialsEndpoints";

interface ExportButtonProps {
  onClick?: () => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onClick }) => {
  const { data: credentialStatus = null } = useGetCredentialsQuery();
  const iconOnly = credentialStatus === null;

  const button = (
    <Button variant="link" onClick={onClick} icon={<ExportIcon />}>
      {iconOnly ? null : "Export"}
    </Button>
  );

  if (iconOnly) {
    return (
      <Tooltip content="Export" position="left">
        {button}
      </Tooltip>
    );
  }

  return button;
};

ExportButton.displayName = "ExportButton";
