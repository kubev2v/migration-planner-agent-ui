import { css } from "@emotion/css";
import {
  Checkbox,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  TextInput,
} from "@patternfly/react-core";
import type { FC, FormEvent } from "react";
import { useRef } from "react";

import PopoverIcon from "../../../PopoverIcon.js";
import {
  CLUSTER_MODE_OPTIONS,
  CONTROL_PLANE_CPU_OPTIONS,
  CONTROL_PLANE_MEMORY_OPTIONS,
  CPU_OPTIONS,
  CPU_OVERCOMMIT_OPTIONS,
  DEFAULT_FORM_VALUES,
  MEMORY_OPTIONS,
  MEMORY_OVERCOMMIT_OPTIONS,
  SMT_THREADS_MAX,
  SMT_THREADS_MIN,
} from "./sizingConstants.js";
import type {
  ClusterMode,
  MemoryOvercommitRatio,
  OvercommitRatio,
  SizingFormValues,
  WorkloadFormValues,
} from "./sizingFormTypes.js";

interface SizingInputFormProps {
  values: SizingFormValues;
  onChange: (values: SizingFormValues) => void;
  showWorkerNode: boolean;
  showControlPlane: boolean;
  showControlPlaneScheduling: boolean;
  showSmt: boolean;
  showWorkloadInputs?: boolean;
  workloadValues?: WorkloadFormValues;
  onWorkloadChange?: (values: WorkloadFormValues) => void;
  /** Vertical single-column layout for the standalone Tools page */
  useStackedLayout?: boolean;
}

const sectionHeaderStyle = css`
  font-size: var(--pf-t--global--font--size--body--lg);
  font-weight: var(--pf-t--global--font--weight--body--bold);
  color: var(--pf-t--global--text--color--regular);
  margin-top: var(--pf-t--global--spacer--200);
  margin-bottom: var(--pf-t--global--spacer--100);
`;

const smtInputStyle = css`
  width: 130px;
`;

const sectionDividerStyle = css`
  border: none;
  border-top: 1px solid var(--pf-t--global--border--color--default);
  margin: var(--pf-t--global--spacer--100) 0;
`;

/** Matches Tools page mockup: labels above inputs, moderate left-aligned width */
const stackedFormStyle = css`
  .pf-v6-c-form-control:not(#smt-threads),
  .pf-v6-c-form-select {
    max-width: 480px;
  }
`;

export const SizingInputForm: FC<SizingInputFormProps> = ({
  values,
  onChange,
  showWorkerNode,
  showControlPlane,
  showControlPlaneScheduling,
  showSmt,
  showWorkloadInputs = false,
  workloadValues,
  onWorkloadChange,
  useStackedLayout = false,
}) => {
  const fieldColumnSpan = useStackedLayout ? 12 : 4;
  const controlPlaneColumnSpan = useStackedLayout ? 12 : 6;
  const clusterModeInWorkloadSection =
    showWorkloadInputs &&
    workloadValues != null &&
    onWorkloadChange != null &&
    useStackedLayout;
  const scheduleOnControlPlaneBeforeCompactRef = useRef<boolean | null>(null);

  const handleClusterModeChange = (
    _event: FormEvent<HTMLSelectElement>,
    mode: string,
  ): void => {
    const clusterMode = mode as ClusterMode;
    const wasControlPlaneOnly =
      values.clusterMode === "single-node" || values.clusterMode === "compact";
    const isControlPlaneOnly =
      clusterMode === "single-node" || clusterMode === "compact";

    let scheduleOnControlPlane = values.scheduleOnControlPlane;
    if (isControlPlaneOnly) {
      if (!wasControlPlaneOnly) {
        scheduleOnControlPlaneBeforeCompactRef.current =
          values.scheduleOnControlPlane;
      }
      scheduleOnControlPlane = true;
    } else if (wasControlPlaneOnly) {
      scheduleOnControlPlane =
        scheduleOnControlPlaneBeforeCompactRef.current ??
        DEFAULT_FORM_VALUES.scheduleOnControlPlane;
      scheduleOnControlPlaneBeforeCompactRef.current = null;
    }

    onChange({
      ...values,
      clusterMode,
      scheduleOnControlPlane,
    });
  };

  const handleControlPlaneChange = (
    _event: FormEvent<HTMLInputElement>,
    checked: boolean,
  ): void => {
    onChange({ ...values, scheduleOnControlPlane: checked });
  };

  const handleSmtEnabledChange = (
    _event: FormEvent<HTMLInputElement>,
    checked: boolean,
  ): void => {
    onChange({ ...values, smtEnabled: checked });
  };

  const handleSmtThreadsChange = (
    _event: FormEvent<HTMLInputElement>,
    value: string,
  ): void => {
    const newValue = parseInt(value, 10);
    if (!Number.isNaN(newValue)) {
      onChange({ ...values, smtThreads: newValue });
    }
  };

  const handleCpuChange = (
    _event: FormEvent<HTMLSelectElement>,
    cpu: string,
  ): void => {
    onChange({
      ...values,
      workerNodePreset: "custom",
      customCpu: parseInt(cpu, 10),
    });
  };

  const handleMemoryChange = (
    _event: FormEvent<HTMLSelectElement>,
    memory: string,
  ): void => {
    onChange({
      ...values,
      workerNodePreset: "custom",
      customMemoryGb: parseInt(memory, 10),
    });
  };

  const handleCpuOvercommitChange = (
    _event: FormEvent<HTMLSelectElement>,
    ratio: string,
  ): void => {
    onChange({
      ...values,
      cpuOvercommitRatio: parseInt(ratio, 10) as OvercommitRatio,
    });
  };

  const handleMemoryOvercommitChange = (
    _event: FormEvent<HTMLSelectElement>,
    ratio: string,
  ): void => {
    onChange({
      ...values,
      memoryOvercommitRatio: parseInt(ratio, 10) as MemoryOvercommitRatio,
    });
  };

  const handleControlPlaneCpuChange = (
    _event: FormEvent<HTMLSelectElement>,
    cpu: string,
  ): void => {
    onChange({ ...values, controlPlaneCpu: parseInt(cpu, 10) });
  };

  const handleControlPlaneMemoryChange = (
    _event: FormEvent<HTMLSelectElement>,
    memory: string,
  ): void => {
    onChange({ ...values, controlPlaneMemoryGb: parseInt(memory, 10) });
  };

  /** Prevent mouse wheel from incrementing/decrementing focused number inputs */
  const handleNumberInputWheel = (
    event: React.WheelEvent<HTMLInputElement>,
  ): void => {
    event.currentTarget.blur();
  };

  const handleWorkloadNumberChange = (
    field: keyof WorkloadFormValues,
  ): ((_event: React.FormEvent<HTMLInputElement>, value: string) => void) => {
    return (_event, value) => {
      if (!workloadValues || !onWorkloadChange) return;
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        onWorkloadChange({ ...workloadValues, [field]: parsed });
      }
    };
  };

  const smtThreadsValidated: "success" | "error" | "default" =
    values.smtEnabled &&
    (values.smtThreads < SMT_THREADS_MIN || values.smtThreads > SMT_THREADS_MAX)
      ? "error"
      : "default";

  const clusterModeField = (
    <GridItem span={useStackedLayout ? 12 : 6}>
      <FormGroup label="Cluster mode" isRequired fieldId="cluster-mode">
        <FormSelect
          id="cluster-mode"
          value={values.clusterMode}
          onChange={handleClusterModeChange}
          aria-label="Cluster mode"
        >
          {CLUSTER_MODE_OPTIONS.map((option) => (
            <FormSelectOption
              key={option.value}
              value={option.value}
              label={option.label}
            />
          ))}
        </FormSelect>
      </FormGroup>
    </GridItem>
  );

  return (
    <Form className={useStackedLayout ? stackedFormStyle : undefined}>
      <Grid hasGutter>
        {showWorkloadInputs && workloadValues && onWorkloadChange && (
          <>
            <GridItem span={12}>
              <div className={sectionHeaderStyle}>Workload & cluster mode</div>
            </GridItem>

            <GridItem span={fieldColumnSpan}>
              <FormGroup
                label="Total VM"
                isRequired
                fieldId="total-vms"
                labelHelp={
                  <PopoverIcon
                    noVerticalAlign
                    headerContent="Total VMs"
                    bodyContent="The total number of virtual machines you plan to migrate to the OpenShift cluster."
                  />
                }
              >
                <TextInput
                  id="total-vms"
                  value={workloadValues.totalVMs}
                  onChange={handleWorkloadNumberChange("totalVMs")}
                  onWheel={handleNumberInputWheel}
                  name="total-vms"
                  aria-label="Total VMs"
                  type="number"
                  min={1}
                />
              </FormGroup>
            </GridItem>

            <GridItem span={fieldColumnSpan}>
              <FormGroup
                label="Total CPU"
                isRequired
                fieldId="total-cpu"
                labelHelp={
                  <PopoverIcon
                    noVerticalAlign
                    headerContent="Total CPU"
                    bodyContent="The total number of CPU cores allocated across all VMs in your source environment."
                  />
                }
              >
                <TextInput
                  id="total-cpu"
                  value={workloadValues.totalCPU}
                  onChange={handleWorkloadNumberChange("totalCPU")}
                  onWheel={handleNumberInputWheel}
                  name="total-cpu"
                  aria-label="Total CPU"
                  type="number"
                  min={1}
                />
              </FormGroup>
            </GridItem>

            <GridItem span={fieldColumnSpan}>
              <FormGroup
                label="Total memory"
                isRequired
                fieldId="total-memory"
                labelHelp={
                  <PopoverIcon
                    noVerticalAlign
                    headerContent="Total memory"
                    bodyContent="The total memory in GB allocated across all VMs in your source environment."
                  />
                }
              >
                <TextInput
                  id="total-memory"
                  value={workloadValues.totalMemory}
                  onChange={handleWorkloadNumberChange("totalMemory")}
                  onWheel={handleNumberInputWheel}
                  name="total-memory"
                  aria-label="Total memory"
                  type="number"
                  min={1}
                />
              </FormGroup>
            </GridItem>

            {clusterModeInWorkloadSection && clusterModeField}
          </>
        )}

        {!clusterModeInWorkloadSection && clusterModeField}

        {showControlPlaneScheduling && (
          <GridItem span={12}>
            <Checkbox
              isLabelWrapped
              id="control-plane-scheduling"
              label="Run workloads on control plane nodes"
              isChecked={values.scheduleOnControlPlane}
              onChange={handleControlPlaneChange}
            />
          </GridItem>
        )}

        {showSmt && (
          <GridItem span={12}>
            {useStackedLayout ? (
              <>
                <Checkbox
                  isLabelWrapped
                  id="smt-enabled"
                  label="Enable SMT/Hyperthreading"
                  isChecked={values.smtEnabled}
                  onChange={handleSmtEnabledChange}
                />
                <TextInput
                  id="smt-threads"
                  value={values.smtThreads}
                  onChange={handleSmtThreadsChange}
                  onWheel={handleNumberInputWheel}
                  name="smt-threads"
                  aria-label="SMT threads"
                  isDisabled={!values.smtEnabled}
                  type="number"
                  className={smtInputStyle}
                  min={SMT_THREADS_MIN}
                  max={SMT_THREADS_MAX}
                  validated={smtThreadsValidated}
                  style={{
                    marginTop: "var(--pf-t--global--spacer--100)",
                  }}
                />
                {smtThreadsValidated === "error" && (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant="error">
                        Value must be between {SMT_THREADS_MIN} and{" "}
                        {SMT_THREADS_MAX}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                )}
              </>
            ) : (
              <Flex
                alignItems={{ default: "alignItemsCenter" }}
                spaceItems={{ default: "spaceItemsSm" }}
              >
                <FlexItem>
                  <Checkbox
                    isLabelWrapped
                    id="smt-enabled"
                    label="Enable SMT/Hyperthreading"
                    isChecked={values.smtEnabled}
                    onChange={handleSmtEnabledChange}
                  />
                </FlexItem>
                <FlexItem>
                  <TextInput
                    id="smt-threads"
                    value={values.smtThreads}
                    onChange={handleSmtThreadsChange}
                    onWheel={handleNumberInputWheel}
                    name="smt-threads"
                    aria-label="SMT threads"
                    isDisabled={!values.smtEnabled}
                    type="number"
                    className={smtInputStyle}
                    min={SMT_THREADS_MIN}
                    max={SMT_THREADS_MAX}
                    validated={smtThreadsValidated}
                  />
                  {smtThreadsValidated === "error" && (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem variant="error">
                          Value must be between {SMT_THREADS_MIN} and{" "}
                          {SMT_THREADS_MAX}
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  )}
                </FlexItem>
              </Flex>
            )}
          </GridItem>
        )}

        {/* Worker node section - show for Full HA and HCP */}
        {showWorkerNode && (
          <>
            <GridItem span={12}>
              <hr className={sectionDividerStyle} />
            </GridItem>

            <GridItem span={12}>
              <div className={sectionHeaderStyle}>Worker node</div>
            </GridItem>

            <GridItem span={fieldColumnSpan}>
              <FormGroup
                label="Worker node CPU core"
                isRequired
                fieldId="worker-cpu"
                labelHelp={
                  <PopoverIcon
                    noVerticalAlign
                    headerContent="Worker node CPU cores"
                    bodyContent="The number of CPU cores allocated to each worker node. Choose based on your workload requirements."
                  />
                }
              >
                <FormSelect
                  id="worker-cpu"
                  value={String(values.customCpu)}
                  onChange={handleCpuChange}
                  aria-label="Worker node CPU cores"
                >
                  {CPU_OPTIONS.map((option) => (
                    <FormSelectOption
                      key={option.value}
                      value={String(option.value)}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
            </GridItem>

            <GridItem span={fieldColumnSpan}>
              <FormGroup
                label="Worker node memory (GB)"
                isRequired
                fieldId="worker-memory"
                labelHelp={
                  <PopoverIcon
                    noVerticalAlign
                    headerContent="Worker node memory size"
                    bodyContent="The amount of memory in GB allocated to each worker node. Choose based on your workload requirements."
                  />
                }
              >
                <FormSelect
                  id="worker-memory"
                  value={String(values.customMemoryGb)}
                  onChange={handleMemoryChange}
                  aria-label="Worker node memory size"
                >
                  {MEMORY_OPTIONS.map((option) => (
                    <FormSelectOption
                      key={option.value}
                      value={String(option.value)}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
            </GridItem>

            <GridItem span={fieldColumnSpan}>
              <FormGroup
                label="CPU overcommitment"
                isRequired
                fieldId="cpu-overcommit-ratio"
                labelHelp={
                  <PopoverIcon
                    noVerticalAlign
                    headerContent="CPU overcommitment"
                    bodyContent="The ratio of virtual CPUs to physical cores. Higher ratios allow more VMs but may impact performance if all VMs peak at once. Example: At 1:4, you can run 400 virtual CPUs on 100 physical cores."
                  />
                }
              >
                <FormSelect
                  id="cpu-overcommit-ratio"
                  value={String(values.cpuOvercommitRatio)}
                  onChange={handleCpuOvercommitChange}
                  aria-label="CPU overcommitment ratio"
                >
                  {CPU_OVERCOMMIT_OPTIONS.map((option) => (
                    <FormSelectOption
                      key={option.value}
                      value={String(option.value)}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
            </GridItem>

            <GridItem span={fieldColumnSpan}>
              <FormGroup
                label="Memory overcommitment"
                isRequired
                fieldId="memory-overcommit-ratio"
                labelHelp={
                  <PopoverIcon
                    noVerticalAlign
                    headerContent="Memory overcommitment"
                    bodyContent="The ratio of virtual memory to physical memory. Higher ratios allow more VMs; memory overcommit is typically more conservative than CPU (max 1:4)."
                  />
                }
              >
                <FormSelect
                  id="memory-overcommit-ratio"
                  value={String(values.memoryOvercommitRatio)}
                  onChange={handleMemoryOvercommitChange}
                  aria-label="Memory overcommitment ratio"
                >
                  {MEMORY_OVERCOMMIT_OPTIONS.map((option) => (
                    <FormSelectOption
                      key={option.value}
                      value={String(option.value)}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
            </GridItem>
          </>
        )}

        {/* Control plane section - show for Full HA, Compact, and Single node */}
        {showControlPlane && (
          <>
            <GridItem span={12}>
              <hr className={sectionDividerStyle} />
            </GridItem>

            <GridItem span={12}>
              <div className={sectionHeaderStyle}>Control plane</div>
            </GridItem>

            <GridItem span={controlPlaneColumnSpan}>
              <FormGroup
                label="Control plane CPU core"
                isRequired
                fieldId="control-plane-cpu"
                labelHelp={
                  <PopoverIcon
                    noVerticalAlign
                    headerContent="Control plane CPU cores"
                    bodyContent="The number of CPU cores allocated to each control plane node."
                  />
                }
              >
                <FormSelect
                  id="control-plane-cpu"
                  value={String(values.controlPlaneCpu)}
                  onChange={handleControlPlaneCpuChange}
                  aria-label="Control plane CPU cores"
                >
                  {CONTROL_PLANE_CPU_OPTIONS.map((option) => (
                    <FormSelectOption
                      key={option.value}
                      value={String(option.value)}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
            </GridItem>

            <GridItem span={controlPlaneColumnSpan}>
              <FormGroup
                label="Control plane memory (GB)"
                isRequired
                fieldId="control-plane-memory"
                labelHelp={
                  <PopoverIcon
                    noVerticalAlign
                    headerContent="Control plane memory size"
                    bodyContent="The amount of memory in GB allocated to each control plane node."
                  />
                }
              >
                <FormSelect
                  id="control-plane-memory"
                  value={String(values.controlPlaneMemoryGb)}
                  onChange={handleControlPlaneMemoryChange}
                  aria-label="Control plane memory size"
                >
                  {CONTROL_PLANE_MEMORY_OPTIONS.map((option) => (
                    <FormSelectOption
                      key={option.value}
                      value={String(option.value)}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
            </GridItem>
          </>
        )}
      </Grid>
    </Form>
  );
};

SizingInputForm.displayName = "SizingInputForm";

export default SizingInputForm;
