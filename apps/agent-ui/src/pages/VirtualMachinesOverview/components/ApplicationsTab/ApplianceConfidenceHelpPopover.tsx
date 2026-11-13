import { PopoverIcon } from "@openshift-migration-advisor/shared-components";
import { Content, Stack, StackItem } from "@patternfly/react-core";
import type React from "react";

export const ApplianceConfidenceHelpPopover: React.FC = () => (
  <PopoverIcon
    noVerticalAlign
    position="top"
    headerContent="Confidence"
    bodyContent={
      <Stack hasGutter>
        <StackItem>
          <Content component="p">
            Confidence estimates how closely a virtual machine&apos;s identity
            signals match known appliance patterns.
          </Content>
        </StackItem>
        <StackItem>
          <Content component="p">
            Stronger, more specific matches increase confidence. Incomplete or
            ambiguous signals reduce confidence.
          </Content>
        </StackItem>
      </Stack>
    }
    aria-label="Confidence help"
    withFocusTrap={false}
  />
);

ApplianceConfidenceHelpPopover.displayName = "ApplianceConfidenceHelpPopover";
