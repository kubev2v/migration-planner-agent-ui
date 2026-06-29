import { Checkbox, FormGroup } from "@patternfly/react-core";
import { Controller, type FieldError, useFormContext } from "react-hook-form";

import FormFieldHelperText from "./FormFieldHelperText";
import type { FormGroupProps } from "./types";

type CheckboxFormGroupProps = Omit<FormGroupProps, "placeholder">;

export default function CheckboxFormGroup({
  id,
  label,
  name,
  isRequired = false,
  isDisabled = false,
  helpText,
  ...props
}: CheckboxFormGroupProps) {
  const methods = useFormContext();
  const error = methods.formState.errors[name] as FieldError | undefined;
  const isTouched = methods.formState.touchedFields[name] as
    | boolean
    | undefined;
  const isSubmitted = methods.formState.isSubmitted;
  const showError = error && (isTouched || isSubmitted);

  return (
    <FormGroup isRequired={isRequired} fieldId={id} {...props}>
      <Controller
        name={name}
        control={methods.control}
        render={({ field }) => {
          return (
            <Checkbox
              label={label}
              id={id}
              isRequired={isRequired}
              isDisabled={isDisabled}
              isChecked={field.value as boolean}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          );
        }}
      />
      <FormFieldHelperText
        helpText={helpText}
        errorMessage={showError ? error?.message : undefined}
      />
    </FormGroup>
  );
}
