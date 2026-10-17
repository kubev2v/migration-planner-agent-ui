import { ExternalLinkAltIcon } from "@patternfly/react-icons";
import type React from "react";
import { MIGRATION_ADVISOR_CONSOLE_URL } from "./redHatSharingLinks";

/** Export / console upload guidance (shared tail of Red Hat sharing help copy). */
export const RedHatSharingExportHelp: React.FC = () => (
  <>
    You can alternatively export your inventory data as a one-time file (
    <strong>Export → JSON (ZIP)</strong>), then upload it in the{" "}
    <a
      href={MIGRATION_ADVISOR_CONSOLE_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      Migration Advisor console <ExternalLinkAltIcon />
    </a>
    . Find this again anytime next to <strong>Red Hat sharing status</strong>.
  </>
);

RedHatSharingExportHelp.displayName = "RedHatSharingExportHelp";
