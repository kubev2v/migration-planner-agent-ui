import { Alert, Button, Content } from "@patternfly/react-core";
import { ExternalLinkAltIcon } from "@patternfly/react-icons";
import type React from "react";

interface DataSharingAlertProps {
  onShare?: () => void;
}

export const DataSharingAlert: React.FC<DataSharingAlertProps> = ({
  onShare,
}) => {
  return (
    <Alert
      variant="info"
      isInline
      title="This report is not currently shared with Red Hat"
    >
      <Content component="p">
        Sharing it with Red Hat unlocks exclusive cloud capabilities and
        enhanced insights.
      </Content>
      <Content component="p">
        {onShare && (
          <Button variant="link" isInline onClick={() => onShare()}>
            Share with Red Hat
          </Button>
        )}
        <a
          href="https://www.redhat.com/en/about/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          style={onShare ? { marginLeft: "1.5rem" } : undefined}
        >
          Learn more <ExternalLinkAltIcon />
        </a>
      </Content>
    </Alert>
  );
};

DataSharingAlert.displayName = "DataSharingAlert";
