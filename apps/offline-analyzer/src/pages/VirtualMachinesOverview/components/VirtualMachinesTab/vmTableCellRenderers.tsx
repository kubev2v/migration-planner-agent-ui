import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { statusLabels } from "./vmTableShared";

export function renderVmStatus(vm: VirtualMachine): React.ReactNode {
  const state = vm.vCenterState || "poweredOff";

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
      {state === "poweredOn" && (
        <>
          <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />{" "}
        </>
      )}
      {statusLabels[state] || state}
    </span>
  );
}
