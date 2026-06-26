import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import {
  Button,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Tooltip,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { isLikelyCanceledInspectionError } from "./vmInspectionUtils";
import { statusLabels } from "./vmTableShared";

export function renderVmStatus(vm: VirtualMachine): React.ReactNode {
  const state = vm.vCenterState || "poweredOff";
  const hasIssues = (vm.issueCount || 0) > 0;

  return (
    <span>
      {state === "poweredOff" && (
        <>
          <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />{" "}
        </>
      )}
      {state === "suspended" && (
        <>
          <ExclamationTriangleIcon color="var(--pf-t--global--icon--color--status--warning--default)" />{" "}
        </>
      )}
      {state === "poweredOn" && hasIssues && (
        <>
          <ExclamationTriangleIcon color="var(--pf-t--global--icon--color--status--warning--default)" />{" "}
        </>
      )}
      {state === "poweredOn" && !hasIssues && (
        <>
          <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />{" "}
        </>
      )}
      {statusLabels[state] || state}
    </span>
  );
}

export function renderVmInspectionStatus(
  vm: VirtualMachine,
  onVMClick?: (vmId: string) => void,
  cancelingVmIds?: Set<string>,
): React.ReactNode {
  const status = vm.inspectionStatus;
  if (!status) return "Not run";

  if (cancelingVmIds?.has(vm.id)) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Spinner size="sm" /> Canceling
      </span>
    );
  }

  const state = status.state;
  const goToDetail = onVMClick ? () => onVMClick(vm.id) : undefined;

  if (state === "pending" || state === "running") {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Spinner size="sm" /> {state === "pending" ? "Pending" : "Running"}
      </span>
    );
  }

  if (state === "error") {
    if (isLikelyCanceledInspectionError(status.error)) {
      return (
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Label color="grey" isCompact>
            Canceled
          </Label>
        </span>
      );
    }

    const concernCount = vm.inspectionConcernCount || 0;

    if (concernCount === 0) {
      return (
        <Tooltip content={status.error || "Deep inspection failed"}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
            {goToDetail ? (
              <Button variant="link" isInline onClick={goToDetail}>
                Error
              </Button>
            ) : (
              "Error"
            )}
          </span>
        </Tooltip>
      );
    }

    return (
      <Flex
        alignItems={{ default: "alignItemsCenter" }}
        spaceItems={{ default: "spaceItemsSm" }}
      >
        <FlexItem>
          <Tooltip
            content={status.error || "Deep inspection encountered an error"}
          >
            <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
          </Tooltip>
        </FlexItem>
        <FlexItem>
          {goToDetail ? (
            <Button variant="link" isInline onClick={goToDetail}>
              {`${concernCount} ${concernCount === 1 ? "issue" : "issues"}`}
            </Button>
          ) : (
            <span>
              {`${concernCount} ${concernCount === 1 ? "issue" : "issues"}`}
            </span>
          )}
        </FlexItem>
      </Flex>
    );
  }

  if (state === "completed") {
    const concernCount = vm.inspectionConcernCount || 0;
    const label = `${concernCount} ${concernCount === 1 ? "issue" : "issues"}`;
    return goToDetail ? (
      <Button variant="link" isInline onClick={goToDetail}>
        {label}
      </Button>
    ) : (
      label
    );
  }

  if (state === "canceled") {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Label color="grey" isCompact>
          Canceled
        </Label>
      </span>
    );
  }

  return "Not run";
}
