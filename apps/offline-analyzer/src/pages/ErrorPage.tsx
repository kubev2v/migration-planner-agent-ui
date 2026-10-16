import { css, keyframes } from "@emotion/css";
import {
  Backdrop,
  Bullseye,
  Button,
  type ButtonProps,
  Card,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Icon,
} from "@patternfly/react-core";
import { ErrorCircleOIcon, WarningTriangleIcon } from "@patternfly/react-icons";
import type React from "react";
import { useLocation, useParams } from "react-router-dom";

const bounce = keyframes`
  from, 20%, 53%, 80%, to {
    transform: translate3d(0,0,0);
  }

  40%, 43% {
    transform: translate3d(0, -30px, 0);
  }

  70% {
    transform: translate3d(0, -15px, 0);
  }

  90% {
    transform: translate3d(0,-4px,0);
  }
`;

const classes = {
  icon: css({
    fontSize: "6rem",
    animation: `${bounce} 1s ease infinite`,
    transformOrigin: "center bottom",
  }),
} as const;

type Props = {
  code?: string;
  message?: string;
  additionalDetails?: string;
  /** A list of actions, the first entry is considered primary and the rest are secondary. */
  actions?: Array<Omit<ButtonProps, "variant">>;
};

const ErrorPage: React.FC<Props> = (props) => {
  const params = useParams();
  const location = useLocation();

  const {
    code = params.code ?? "500",
    message = location.state?.message ?? "That's on us...",
    additionalDetails,
    actions = [],
  } = props;
  const [primaryAction, ...otherActions] = actions;

  return (
    <Backdrop>
      <Bullseye>
        <Card
          style={{ width: "36rem", height: "38rem", justifyContent: "center" }}
        >
          <EmptyState>
            <Icon
              className={classes.icon}
              size="xl"
              status={Number.parseInt(code, 10) < 500 ? "warning" : "danger"}
            >
              {Number.parseInt(code, 10) < 500 ? (
                <WarningTriangleIcon />
              ) : (
                <ErrorCircleOIcon />
              )}
            </Icon>
            <EmptyStateBody>
              <Content component="h1">{code}</Content>
              <Content component="h2">{message}</Content>
              {additionalDetails && <Content>{additionalDetails}</Content>}
            </EmptyStateBody>

            {actions.length > 0 && (
              <EmptyStateFooter>
                <EmptyStateActions>
                  <Button variant="primary" {...primaryAction} />
                </EmptyStateActions>
                <EmptyStateActions>
                  {otherActions.map(({ key, ...props }) => (
                    <Button key={key} variant="secondary" {...props} />
                  ))}
                </EmptyStateActions>
              </EmptyStateFooter>
            )}
          </EmptyState>
        </Card>
      </Bullseye>
    </Backdrop>
  );
};

ErrorPage.displayName = "ErrorPage";

export default ErrorPage;
