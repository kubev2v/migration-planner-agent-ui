import { ExternalLinkAltIcon } from "@patternfly/react-icons";
import type React from "react";
import { RED_HAT_PRIVACY_POLICY_URL } from "./redHatSharingLinks";

export const PrivacyPolicyLink: React.FC = () => {
  return (
    <a
      aria-label="Red Hat privacy policy"
      href={RED_HAT_PRIVACY_POLICY_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      Privacy policy <ExternalLinkAltIcon />
    </a>
  );
};

PrivacyPolicyLink.displayName = "PrivacyPolicyLink";
