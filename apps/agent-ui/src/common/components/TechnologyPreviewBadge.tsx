import { Label, Popover } from "@patternfly/react-core";
import { ExternalLinkAltIcon } from "@patternfly/react-icons/dist/esm/icons/external-link-alt-icon";
import { InfoCircleIcon } from "@patternfly/react-icons/dist/js/icons/info-circle-icon";
import type React from "react";

export type TechnologyPreviewBadgeProps = {
  text?: string;
};

export const TechnologyPreviewBadge: React.FC<TechnologyPreviewBadgeProps> = ({
  text = "Technology preview",
}) => {
  return (
    <Popover
      bodyContent={
        <div>
          Technology preview features provide early access to upcoming product
          innovations, enabling you to test functionality and provide feedback
          during the development process.{" "}
          <a
            href="https://access.redhat.com/support/offerings/techpreview"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more <ExternalLinkAltIcon />
          </a>
        </div>
      }
      position="right"
      withFocusTrap={false}
    >
      <Label
        style={{ cursor: "pointer" }}
        color="purple"
        icon={<InfoCircleIcon />}
        isCompact
      >
        {text}
      </Label>
    </Popover>
  );
};
TechnologyPreviewBadge.displayName = "TechnologyPreviewBadge";
