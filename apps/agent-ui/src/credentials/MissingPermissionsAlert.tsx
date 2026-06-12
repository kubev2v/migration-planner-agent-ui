import { Alert, Content } from "@patternfly/react-core";
import type React from "react";

interface MissingPermissionsAlertProps {
  feature: "deep inspection" | "storage offload estimator";
  missingPrivileges: string[];
}

export const MissingPermissionsAlert: React.FC<
  MissingPermissionsAlertProps
> = ({ feature, missingPrivileges }) => {
  if (missingPrivileges.length === 0) return null;

  return (
    <Alert
      variant="warning"
      title="Missing required permissions"
      isInline
      style={{ marginBottom: "16px" }}
    >
      <Content component="p">
        Your saved vCenter credentials do not have the permissions needed for{" "}
        {feature === "deep inspection"
          ? "deep inspection"
          : "the storage offload estimator"}
        . Contact your vCenter administrator to be granted new permissions.
      </Content>
      <Content component="p" style={{ marginTop: "8px", fontWeight: 600 }}>
        Missing permissions:
      </Content>
      <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
        {missingPrivileges.map((privilege) => (
          <li key={privilege}>
            <code>{privilege}</code>
          </li>
        ))}
      </ul>
    </Alert>
  );
};

MissingPermissionsAlert.displayName = "MissingPermissionsAlert";
