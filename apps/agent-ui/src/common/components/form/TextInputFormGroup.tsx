import {
  FormGroup,
  TextInput,
  type TextInputProps,
  ValidatedOptions,
} from "@patternfly/react-core";
import { type FieldError, useFormContext } from "react-hook-form";

import FormFieldHelperText from "./FormFieldHelperText";
import type { FormGroupProps } from "./types";

interface TextInputFormGroupProps extends FormGroupProps {
  type?: TextInputProps["type"];
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  isDisabled?: boolean;
}

export default function TextInputFormGroup({
  id,
  label,
  name,
  isRequired = false,
  placeholder = "",
  type = "text",
  onBlur,
  isDisabled = false,
  helpText,
  ...props
}: TextInputFormGroupProps) {
  const methods = useFormContext();
  const error = methods.formState.errors[name] as FieldError | undefined;
  const isTouched = methods.formState.touchedFields[name] as
    | boolean
    | undefined;
  const isSubmitted = methods.formState.isSubmitted;
  const registration = methods.register(name);
  const showError = error && (isTouched || isSubmitted);

  return (
    <FormGroup label={label} isRequired={isRequired} fieldId={id} {...props}>
      <TextInput
        id={id}
        placeholder={placeholder}
        isRequired={isRequired}
        validated={
          showError ? ValidatedOptions.error : ValidatedOptions.default
        }
        type={type}
        isDisabled={isDisabled}
        {...registration}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
          void registration.onBlur(e);
          onBlur?.(e);
        }}
      />
      <FormFieldHelperText
        helpText={helpText}
        errorMessage={showError ? error?.message : undefined}
      />
    </FormGroup>
  );
}
