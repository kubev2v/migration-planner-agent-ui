import { Label, Popover } from "@patternfly/react-core";
import { ExternalLinkAltIcon } from "@patternfly/react-icons/dist/esm/icons/external-link-alt-icon";
import { InfoCircleIcon } from "@patternfly/react-icons/dist/js/icons/info-circle-icon";
import type React from "react";

export enum TechnologyPreviewBadgePosition {
  default,
  inline,
  inlineRight,
}

export type TechnologyPreviewBadgeProps = {
  position?: TechnologyPreviewBadgePosition;
  className?: string;
  text?: string;
  externalLink?: string;
  popoverContent?: React.ReactNode;
};

export const TechnologyPreviewBadge: React.FC<TechnologyPreviewBadgeProps> = ({
  position = TechnologyPreviewBadgePosition.inline,
  className = "pf-v6-u-ml-md",
  text = "Technology preview",
}) => {
  let clsName = className;
  switch (position) {
    case TechnologyPreviewBadgePosition.inlineRight:
      clsName += " pf-v6-u-float-right";
      break;
    case TechnologyPreviewBadgePosition.inline:
      clsName += " pf-v6-u-display-inline";
      break;
  }
  const bodyContent = (
    <>
      <div style={{ marginBottom: "var(--pf-t--global--spacer--sm)" }}>
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
    </>
  );
  return (
    <Popover bodyContent={bodyContent} position="top" withFocusTrap={false}>
      <Label
        style={{ cursor: "pointer" }}
        color="orange"
        icon={<InfoCircleIcon />}
        className={clsName}
      >
        {text}
      </Label>
    </Popover>
  );
};
TechnologyPreviewBadge.displayName = "TechnologyPreviewBadge";
