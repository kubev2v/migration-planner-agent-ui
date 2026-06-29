import {
  FormHelperText,
  HelperText,
  HelperTextItem,
} from "@patternfly/react-core";
import { ExclamationCircleIcon } from "@patternfly/react-icons";

interface FormFieldHelperTextProps {
  helpText?: string;
  errorMessage?: string;
}

export default function FormFieldHelperText({
  helpText,
  errorMessage,
}: FormFieldHelperTextProps) {
  if (!helpText && !errorMessage) return null;

  return (
    <FormHelperText>
      <HelperText>
        {errorMessage ? (
          <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
            {errorMessage}
          </HelperTextItem>
        ) : (
          helpText && <HelperTextItem>{helpText}</HelperTextItem>
        )}
      </HelperText>
    </FormHelperText>
  );
}
