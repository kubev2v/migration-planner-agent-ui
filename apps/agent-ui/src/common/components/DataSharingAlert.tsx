import { Alert, Button, Content, Icon, Tooltip } from "@patternfly/react-core";
import {
  ExternalLinkAltIcon,
  QuestionCircleIcon,
} from "@patternfly/react-icons";
import type React from "react";

interface DataSharingAlertProps {
  onShare?: () => void;
  onDownloadInventory?: () => void;
}

export const DataSharingAlert: React.FC<DataSharingAlertProps> = ({
  onShare,
  onDownloadInventory,
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
      <div>
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
        {onDownloadInventory && (
          <>
            <Button
              variant="link"
              isInline
              onClick={() => onDownloadInventory()}
              style={{ marginLeft: "1.5rem" }}
            >
              Download inventory
            </Button>
            <Tooltip
              content={
                <span>
                  To share your aggregated data manually, you can download here
                  the inventory JSON file and upload it to the environment at{" "}
                  <a
                    href="https://console.redhat.com/openshift/migration-assessment/environments/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "white", textDecoration: "underline" }}
                  >
                    https://console.redhat.com/openshift/migration-assessment/environments/
                  </a>
                </span>
              }
            >
              <Icon status="info" style={{ marginLeft: "0.2rem" }}>
                <QuestionCircleIcon />
              </Icon>
            </Tooltip>
          </>
        )}
      </div>
    </Alert>
  );
};

DataSharingAlert.displayName = "DataSharingAlert";
