import { Checkbox, Flex, FlexItem } from "@patternfly/react-core";
import { ExternalLinkAltIcon } from "@patternfly/react-icons";
import type React from "react";

interface DataSharingCheckboxProps {
  isChecked: boolean;
  onChange: (checked: boolean) => void;
  isDisabled?: boolean;
}

export const DataSharingCheckbox: React.FC<DataSharingCheckboxProps> = ({
  isChecked,
  onChange,
  isDisabled = false,
}) => {
  return (
    <Flex direction={{ default: "column" }} gap={{ default: "gapSm" }}>
      <FlexItem>
        <Flex
          gap={{ default: "gapSm" }}
          alignItems={{ default: "alignItemsCenter" }}
        >
          <FlexItem>
            <Checkbox
              id="data-sharing-checkbox"
              label={
                <span>
                  Share aggregated environment data with Red Hat.{" "}
                  <a
                    href="https://kubev2v.github.io/openshift-migration-advisor-docs/docs/aggregated-data-report/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn more <ExternalLinkAltIcon />
                  </a>
                </span>
              }
              description={
                <span>
                  Data is anonymized and strictly excludes personally
                  identifiable infrastructure info (VM/host/cluster/disk names).
                </span>
              }
              isChecked={isChecked}
              onChange={(_event, checked) => onChange(checked)}
              isDisabled={isDisabled}
            />
          </FlexItem>
        </Flex>
      </FlexItem>
    </Flex>
  );
};

DataSharingCheckbox.displayName = "DataSharingCheckbox";
