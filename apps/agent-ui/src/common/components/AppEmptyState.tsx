import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
} from "@patternfly/react-core";
import type { ComponentType, CSSProperties, ReactNode } from "react";

export interface AppEmptyStateProps {
  titleText: ReactNode;
  body?: ReactNode;
  icon?: ComponentType;
  variant?: EmptyStateVariant;
  headingLevel?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  status?: "danger" | "warning" | "success" | "info" | "custom";
  children?: ReactNode;
  wrapInBullseye?: boolean;
  bullseyeStyle?: CSSProperties;
  style?: CSSProperties;
}

export const AppEmptyState: React.FC<AppEmptyStateProps> = ({
  titleText,
  body,
  icon,
  variant = EmptyStateVariant.sm,
  headingLevel = "h3",
  status,
  children,
  wrapInBullseye = true,
  bullseyeStyle = { padding: "32px 0" },
  style,
}) => {
  const emptyState = (
    <EmptyState
      headingLevel={headingLevel}
      titleText={titleText}
      {...(icon ? { icon } : {})}
      variant={variant}
      {...(status ? { status } : {})}
      {...(style ? { style } : {})}
    >
      {body ? <EmptyStateBody>{body}</EmptyStateBody> : null}
      {children}
    </EmptyState>
  );

  if (!wrapInBullseye) {
    return emptyState;
  }

  return <Bullseye style={bullseyeStyle}>{emptyState}</Bullseye>;
};

AppEmptyState.displayName = "AppEmptyState";
