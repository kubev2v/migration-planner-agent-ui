import { Button, Content } from "@patternfly/react-core";
import type React from "react";
import { RedHatSharingExportHelp } from "./RedHatSharingExportHelp";

interface RedHatSharingHelpContentProps {
  onShare?: () => void;
  inlineShareAction?: boolean;
}

export const RedHatSharingHelpContent: React.FC<
  RedHatSharingHelpContentProps
> = ({ onShare, inlineShareAction = false }) => {
  return (
    <Content component="p">
      {inlineShareAction && onShare ? (
        <>
          <Button variant="link" isInline onClick={() => onShare()}>
            Share your data with Red Hat
          </Button>{" "}
          for a more detailed analysis of your environment.{" "}
        </>
      ) : (
        <>
          Share your data with Red Hat for a more detailed analysis of your
          environment.{" "}
        </>
      )}
      <RedHatSharingExportHelp />
    </Content>
  );
};

RedHatSharingHelpContent.displayName = "RedHatSharingHelpContent";
