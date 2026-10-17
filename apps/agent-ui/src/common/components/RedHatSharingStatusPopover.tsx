import {
  PopoverIcon,
  popoverPlainCloseButtonStyle,
} from "@openshift-migration-advisor/shared-components";
import { Content } from "@patternfly/react-core";
import type React from "react";
import { PrivacyPolicyLink } from "./PrivacyPolicyLink";
import { RedHatSharingHelpContent } from "./RedHatSharingHelpContent";

interface RedHatSharingStatusPopoverProps {
  onShare: () => void;
}

export const RedHatSharingStatusPopover: React.FC<
  RedHatSharingStatusPopoverProps
> = ({ onShare }) => {
  return (
    <PopoverIcon
      className={popoverPlainCloseButtonStyle}
      position="bottom-start"
      headerContent="Red Hat sharing status"
      withFocusTrap={false}
      noVerticalAlign
      aria-label="Red Hat sharing status information"
      bodyContent={(hide) => (
        <>
          <RedHatSharingHelpContent
            inlineShareAction
            onShare={() => {
              hide();
              onShare();
            }}
          />
          <Content component="p">
            <PrivacyPolicyLink />
          </Content>
        </>
      )}
    />
  );
};

RedHatSharingStatusPopover.displayName = "RedHatSharingStatusPopover";
