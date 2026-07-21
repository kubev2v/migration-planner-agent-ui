import {
  Button,
  type ButtonProps,
  Icon,
  Popover,
} from "@patternfly/react-core";
import type { PopoverProps } from "@patternfly/react-core/dist/js/components/Popover/Popover";
import { QuestionCircleIcon } from "@patternfly/react-icons";
import type React from "react";

type PopoverIconProps = PopoverProps & {
  variant?: ButtonProps["variant"];
  noVerticalAlign?: boolean;
  buttonOuiaId?: string;
  buttonStyle?: React.CSSProperties;
};

const PopoverIcon: React.FC<PopoverIconProps> = ({
  variant = "plain",
  noVerticalAlign = false,
  buttonOuiaId,
  buttonStyle,
  "aria-label": ariaLabel,
  ...props
}) => (
  <Popover {...props}>
    <Button
      icon={
        <Icon isInline={noVerticalAlign}>
          <QuestionCircleIcon />
        </Icon>
      }
      variant={variant}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="pf-v6-c-form__group-label-help pf-v6-u-p-0"
      ouiaId={buttonOuiaId}
      style={buttonStyle}
    />
  </Popover>
);

export default PopoverIcon;
