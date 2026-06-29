import type { FormGroupProps as PFFormGroupProps } from "@patternfly/react-core";

export interface FormGroupProps extends Omit<PFFormGroupProps, "fieldId"> {
  id: string;
  name: string;
  label?: string;
  isRequired?: boolean;
  placeholder?: string;
  helpText?: string;
  isDisabled?: boolean;
}
