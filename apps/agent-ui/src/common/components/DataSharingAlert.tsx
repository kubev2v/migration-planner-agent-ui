import {
  Alert,
  AlertActionCloseButton,
  Button,
  Content,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import type React from "react";
import { PrivacyPolicyLink } from "./PrivacyPolicyLink";
import { RedHatSharingHelpContent } from "./RedHatSharingHelpContent";

interface DataSharingAlertProps {
  onShare?: () => void;
  onDismiss?: () => void;
}

export const DataSharingAlert: React.FC<DataSharingAlertProps> = ({
  onShare,
  onDismiss,
}) => {
  return (
    <Alert
      variant="info"
      isInline
      title="This report is not shared with Red Hat"
      actionClose={
        onDismiss ? <AlertActionCloseButton onClose={onDismiss} /> : undefined
      }
    >
      <RedHatSharingHelpContent />
      <Content component="p">
        <Flex
          columnGap={{ default: "columnGapLg" }}
          flexWrap={{ default: "wrap" }}
        >
          {onShare && (
            <FlexItem>
              <Button variant="link" isInline onClick={() => onShare()}>
                Share with Red Hat
              </Button>
            </FlexItem>
          )}
          <FlexItem>
            <PrivacyPolicyLink />
          </FlexItem>
        </Flex>
      </Content>
    </Alert>
  );
};

DataSharingAlert.displayName = "DataSharingAlert";
