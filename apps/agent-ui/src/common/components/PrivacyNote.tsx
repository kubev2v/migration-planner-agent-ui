import { Alert, AlertVariant } from "@patternfly/react-core";
import { ExternalLinkAltIcon } from "@patternfly/react-icons";
import type React from "react";

export const PrivacyNote: React.FC = () => {
  return (
    <Alert
      variant={AlertVariant.info}
      isInline
      title="How Red Hat protects your data"
      component="h3"
    >
      Data is anonymized and strictly excludes personally identifiable
      infrastructure info (VM/host/cluster/disk names). <br />
      Red Hat never stores your vCenter credentials.{" "}
      <a
        href="https://kubev2v.github.io/openshift-migration-advisor-docs/docs/aggregated-data-report/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn more <ExternalLinkAltIcon />
      </a>
    </Alert>
  );
};

PrivacyNote.displayName = "PrivacyNote";
