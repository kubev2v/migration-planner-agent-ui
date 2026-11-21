import {
  Button,
  type ButtonProps,
  Icon,
  Popover,
  type PopoverProps,
} from "@patternfly/react-core";
import { OutlinedQuestionCircleIcon } from "@patternfly/react-icons";
import type { CSSProperties, FC } from "react";

type PopoverIconProps = PopoverProps & {
  variant?: ButtonProps["variant"];
  noVerticalAlign?: boolean;
  buttonOuiaId?: string;
  buttonStyle?: CSSProperties;
};

const PopoverIcon: FC<PopoverIconProps> = ({
  variant = "plain",
  noVerticalAlign = false,
  buttonOuiaId,
  buttonStyle,
  "aria-label": ariaLabel,
  ...props
}) => (
  <Popover {...props}>
    <Button
      size="sm"
      icon={
        <Icon isInline={noVerticalAlign}>
          <OutlinedQuestionCircleIcon />
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
