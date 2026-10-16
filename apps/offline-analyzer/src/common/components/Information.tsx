import { Alert, AlertVariant } from "@patternfly/react-core";
import type React from "react";
import type { ReactNode } from "react";

export interface ApiError {
  code?: number;
  message: string;
}

interface InformationProps {
  error: ApiError | null;
  children: ReactNode;
}

export const Information: React.FC<InformationProps> = ({
  error,
  children,
}) => {
  if (error) {
    const title = error.code ? `Error ${error.code}` : "Error";
    return (
      <Alert variant={AlertVariant.danger} isInline title={title}>
        {error.message}
      </Alert>
    );
  }

  return <>{children}</>;
};

Information.displayName = "Information";
