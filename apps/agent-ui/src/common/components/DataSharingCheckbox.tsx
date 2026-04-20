import {
  Checkbox,
  Content,
  Flex,
  FlexItem,
  Icon,
  Popover,
} from "@patternfly/react-core";
import {
  ExternalLinkAltIcon,
  OutlinedQuestionCircleIcon,
} from "@patternfly/react-icons";
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
              label="I agree to share aggregated data about my environment with Red Hat."
              isChecked={isChecked}
              onChange={(_event, checked) => onChange(checked)}
              isDisabled={isDisabled}
            />
          </FlexItem>
          <FlexItem>
            <Popover
              headerContent="Sharing aggregated data with Red Hat"
              bodyContent={
                <div>
                  Sharing aggregated data with Red Hat will enable you to use{" "}
                  <strong>Cost Prediction</strong> and{" "}
                  <strong>Create Target Cluster</strong> features.
                </div>
              }
            >
              <Icon isInline status="info">
                <OutlinedQuestionCircleIcon />
              </Icon>
            </Popover>
          </FlexItem>
        </Flex>
      </FlexItem>

      <FlexItem>
        <Content component="small">
          Aggregated data does not include names of virtual machines, hosts,
          clusters, data centers, datastores, disks and networks.{" "}
          <a
            href="https://kubev2v.github.io/openshift-migration-advisor-docs/docs/aggregated-data-report/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more <ExternalLinkAltIcon />
          </a>
        </Content>
      </FlexItem>
    </Flex>
  );
};

DataSharingCheckbox.displayName = "DataSharingCheckbox";
