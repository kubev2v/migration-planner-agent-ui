import { Checkbox, Flex, FlexItem } from "@patternfly/react-core";
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
              label="Share aggregated environment data with Red Hat."
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
