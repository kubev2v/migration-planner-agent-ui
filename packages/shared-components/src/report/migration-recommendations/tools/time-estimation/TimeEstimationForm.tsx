import { css } from "@emotion/css";
import {
  Flex,
  FlexItem,
  FormGroup,
  Slider,
  type SliderOnChangeEvent,
  Stack,
  StackItem,
  TextInput,
} from "@patternfly/react-core";
import type { FC, FocusEvent, FormEvent } from "react";
import { useCallback, useState } from "react";

import { ESTIMATION_SLIDER_LIMITS } from "./timeEstimationConstants.js";
import type { EstimationFormValues } from "./timeEstimationFormTypes.js";

interface TimeEstimationFormProps {
  values: EstimationFormValues;
  onChange: (values: EstimationFormValues) => void;
}

const sliderRowStyle = css`
  align-items: center;
  gap: var(--pf-t--global--spacer--300);
`;

const inputStyle = css`
  max-width: 80px;
`;

const inputWideStyle = css`
  max-width: 110px;
`;

const rangeLabelsStyle = css`
  display: flex;
  justify-content: space-between;
  color: var(--pf-t--global--text--color--subtle);
  font-size: var(--pf-t--global--font--size--sm);
  margin-top: calc(-1 * var(--pf-t--global--spacer--100));
`;

const sliderWrapperStyle = css`
  flex: 1;
`;

interface SliderFieldProps {
  label: string;
  fieldId: string;
  value: number;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
  wideInput?: boolean;
  onChange: (value: number) => void;
}

const SliderField: FC<SliderFieldProps> = ({
  label,
  fieldId,
  value,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  wideInput = false,
  onChange,
}) => {
  const [draftValue, setDraftValue] = useState<string | null>(null);

  const commitDraft = useCallback(
    (raw: string) => {
      if (raw.trim() === "") {
        setDraftValue(null);
        return;
      }
      const parsed = parseFloat(raw);
      if (Number.isNaN(parsed)) {
        setDraftValue(null);
        return;
      }
      const clamped = Math.min(max, Math.max(min, parsed));
      const rounded = Math.round(clamped / step) * step;
      onChange(parseFloat(rounded.toFixed(10)));
      setDraftValue(null);
    },
    [onChange, min, max, step],
  );

  const handleSliderChange = useCallback(
    (_event: SliderOnChangeEvent, sliderValue: number) => {
      setDraftValue(null);
      onChange(sliderValue);
    },
    [onChange],
  );

  const handleInputChange = useCallback(
    (_event: FormEvent<HTMLInputElement>, inputValue: string) => {
      setDraftValue(inputValue);
    },
    [],
  );

  const handleInputBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      commitDraft(event.currentTarget.value);
    },
    [commitDraft],
  );

  return (
    <FormGroup label={label} fieldId={fieldId}>
      <Flex className={sliderRowStyle}>
        <FlexItem>
          <TextInput
            id={fieldId}
            type="number"
            value={draftValue ?? value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            aria-label={label}
            className={wideInput ? inputWideStyle : inputStyle}
          />
        </FlexItem>
        <FlexItem grow={{ default: "grow" }}>
          <div className={sliderWrapperStyle}>
            <Slider
              value={value}
              min={min}
              max={max}
              step={step}
              onChange={handleSliderChange}
              aria-label={label}
              showBoundaries={false}
              showTicks={false}
            />
            <div className={rangeLabelsStyle}>
              <span>{minLabel}</span>
              <span>{maxLabel}</span>
            </div>
          </div>
        </FlexItem>
      </Flex>
    </FormGroup>
  );
};

export const TimeEstimationForm: FC<TimeEstimationFormProps> = ({
  values,
  onChange,
}) => {
  const limits = ESTIMATION_SLIDER_LIMITS;

  const handleFieldChange = useCallback(
    (field: keyof EstimationFormValues) => (raw: number) => {
      onChange({ ...values, [field]: raw });
    },
    [values, onChange],
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <SliderField
          label="Network transfer rate"
          fieldId="estimation-transfer-rate"
          value={values.transferRateMbps}
          min={limits.transferRateMbps.min}
          max={limits.transferRateMbps.max}
          step={limits.transferRateMbps.step}
          minLabel={`${limits.transferRateMbps.min} Mbps`}
          maxLabel="10,000 Mbps"
          wideInput
          onChange={handleFieldChange("transferRateMbps")}
        />
      </StackItem>

      <StackItem>
        <SliderField
          label="Work hours per day"
          fieldId="estimation-work-hours"
          value={values.workHoursPerDay}
          min={limits.workHoursPerDay.min}
          max={limits.workHoursPerDay.max}
          step={limits.workHoursPerDay.step}
          minLabel={`${limits.workHoursPerDay.min} hours`}
          maxLabel="24 hours"
          onChange={handleFieldChange("workHoursPerDay")}
        />
      </StackItem>

      <StackItem>
        <SliderField
          label="Troubleshooting time per VM"
          fieldId="estimation-troubleshoot"
          value={values.troubleshootMinsPerVm}
          min={limits.troubleshootMinsPerVm.min}
          max={limits.troubleshootMinsPerVm.max}
          step={limits.troubleshootMinsPerVm.step}
          minLabel={`${limits.troubleshootMinsPerVm.min} minutes`}
          maxLabel="180 minutes"
          onChange={handleFieldChange("troubleshootMinsPerVm")}
        />
      </StackItem>

      <StackItem>
        <SliderField
          label="Post-migration engineers"
          fieldId="estimation-engineers"
          value={values.postMigrationEngineers}
          min={limits.postMigrationEngineers.min}
          max={limits.postMigrationEngineers.max}
          step={limits.postMigrationEngineers.step}
          minLabel={`${limits.postMigrationEngineers.min} engineers`}
          maxLabel="50 engineers"
          onChange={handleFieldChange("postMigrationEngineers")}
        />
      </StackItem>
    </Stack>
  );
};

TimeEstimationForm.displayName = "TimeEstimationForm";
