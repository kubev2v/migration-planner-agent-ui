import { yupResolver } from "@hookform/resolvers/yup";
import { FormFieldHelperText } from "@openshift-migration-advisor/shared-components";
import {
  Button,
  Form,
  FormGroup,
  Label,
  LabelGroup,
  MenuToggle,
  type MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  type SelectOptionProps,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from "@patternfly/react-core";
import { TimesIcon } from "@patternfly/react-icons";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { labelSchema } from "./labelValidation";

const NO_RESULTS = "no-results";
const CREATE_NEW = "create-new";

export { MAX_LABEL_LENGTH } from "./labelValidation";

const schema = yup.object().shape({
  label: labelSchema,
});

type LabelFormValues = yup.InferType<typeof schema>;

interface AddLabelsFormProps {
  existingLabels: string[];
  selected: string[];
  onSelectedChange: (labels: string[]) => void;
  mode?: "add" | "edit";
}

export const AddLabelsForm: React.FC<AddLabelsFormProps> = ({
  existingLabels,
  selected,
  onSelectedChange,
  mode = "add",
}) => {
  const {
    watch,
    setValue,
    clearErrors,
    handleSubmit,
    formState: { errors },
  } = useForm<LabelFormValues>({
    resolver: yupResolver(schema),
    mode: "onSubmit",
    defaultValues: { label: "" },
  });

  const inputValue = watch("label") ?? "";

  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [selectOptions, setSelectOptions] = useState<SelectOptionProps[]>([]);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>(undefined);

  useEffect(() => {
    let newOptions: SelectOptionProps[];

    if (inputValue) {
      const filtered = existingLabels.filter((label) =>
        label.toLowerCase().includes(inputValue.toLowerCase()),
      );

      if (filtered.length === 0) {
        const alreadySelected = selected.some(
          (s) => s.toLowerCase() === inputValue.trim().toLowerCase(),
        );

        if (!alreadySelected && inputValue.trim()) {
          newOptions = [
            {
              value: CREATE_NEW,
              children: `Create "${inputValue.trim()}"`,
            },
          ];
        } else {
          newOptions = [
            {
              isAriaDisabled: true,
              children: `No results found for "${inputValue}"`,
              value: NO_RESULTS,
            },
          ];
        }
      } else {
        newOptions = filtered.map((label) => ({
          value: label,
          children: label,
          isSelected: selected.includes(label),
        }));

        const exactMatch = existingLabels.some(
          (l) => l.toLowerCase() === inputValue.trim().toLowerCase(),
        );
        const alreadySelected = selected.some(
          (s) => s.toLowerCase() === inputValue.trim().toLowerCase(),
        );
        if (!exactMatch && !alreadySelected && inputValue.trim()) {
          newOptions.push({
            value: CREATE_NEW,
            children: `Create "${inputValue.trim()}"`,
          });
        }
      }
    } else {
      newOptions = existingLabels.map((label) => ({
        value: label,
        children: label,
        isSelected: selected.includes(label),
      }));
    }

    setSelectOptions(newOptions);
  }, [inputValue, existingLabels, selected]);

  const createItemId = (value: string) =>
    `select-multi-typeahead-${value.replace(/\s/g, "-")}`;

  const setActiveAndFocusedItem = (itemIndex: number) => {
    setFocusedItemIndex(itemIndex);
    const focusedItem = selectOptions[itemIndex];
    if (focusedItem) {
      setActiveItemId(createItemId(String(focusedItem.value)));
    }
  };

  const resetActiveAndFocusedItem = () => {
    setFocusedItemIndex(null);
    setActiveItemId(null);
  };

  const closeMenu = () => {
    setIsSelectOpen(false);
    resetActiveAndFocusedItem();
  };

  const onInputClick = () => {
    if (!isSelectOpen) {
      setIsSelectOpen(true);
    } else if (!inputValue) {
      closeMenu();
    }
  };

  const createLabel = handleSubmit(({ label }) => {
    const trimmed = (label ?? "").trim();
    if (trimmed && !selected.includes(trimmed)) {
      onSelectedChange([...selected, trimmed]);
    }
    setValue("label", "");
    resetActiveAndFocusedItem();
    textInputRef.current?.focus();
  });

  const onSelect = (value: string) => {
    if (value === NO_RESULTS) return;

    if (value === CREATE_NEW) {
      void createLabel();
      return;
    }

    if (selected.includes(value)) {
      onSelectedChange(selected.filter((s) => s !== value));
    } else {
      onSelectedChange([...selected, value]);
    }
    textInputRef.current?.focus();
  };

  const onTextInputChange = (
    _event: React.FormEvent<HTMLInputElement>,
    value: string,
  ) => {
    setValue("label", value);
    if (errors.label) {
      clearErrors("label");
    }
    resetActiveAndFocusedItem();
    if (!isSelectOpen) {
      setIsSelectOpen(true);
    }
  };

  const handleMenuArrowKeys = (key: string) => {
    if (!isSelectOpen) {
      setIsSelectOpen(true);
    }

    if (selectOptions.every((option) => option.isAriaDisabled)) {
      return;
    }

    let indexToFocus = 0;

    if (key === "ArrowUp") {
      if (focusedItemIndex === null || focusedItemIndex === 0) {
        indexToFocus = selectOptions.length - 1;
      } else {
        indexToFocus = focusedItemIndex - 1;
      }
      while (selectOptions[indexToFocus]?.isAriaDisabled) {
        indexToFocus--;
        if (indexToFocus < 0) indexToFocus = selectOptions.length - 1;
      }
    }

    if (key === "ArrowDown") {
      if (
        focusedItemIndex === null ||
        focusedItemIndex === selectOptions.length - 1
      ) {
        indexToFocus = 0;
      } else {
        indexToFocus = focusedItemIndex + 1;
      }
      while (selectOptions[indexToFocus]?.isAriaDisabled) {
        indexToFocus++;
        if (indexToFocus >= selectOptions.length) indexToFocus = 0;
      }
    }

    setActiveAndFocusedItem(indexToFocus);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const focusedItem =
      focusedItemIndex !== null ? selectOptions[focusedItemIndex] : null;

    switch (event.key) {
      case "Enter":
        event.preventDefault();
        if (
          isSelectOpen &&
          focusedItem &&
          !focusedItem.isAriaDisabled &&
          focusedItem.value !== NO_RESULTS
        ) {
          onSelect(String(focusedItem.value));
        } else if (!isSelectOpen) {
          setIsSelectOpen(true);
        } else if (inputValue.trim()) {
          void createLabel();
        }
        break;
      case "ArrowUp":
      case "ArrowDown":
        event.preventDefault();
        handleMenuArrowKeys(event.key);
        break;
    }
  };

  const onToggleClick = () => {
    setIsSelectOpen(!isSelectOpen);
    textInputRef.current?.focus();
  };

  const onClearButtonClick = () => {
    onSelectedChange([]);
    setValue("label", "");
    clearErrors("label");
    resetActiveAndFocusedItem();
    textInputRef.current?.focus();
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      variant="typeahead"
      aria-label="Multi typeahead labels toggle"
      onClick={onToggleClick}
      innerRef={toggleRef}
      isExpanded={isSelectOpen}
      isFullWidth
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={inputValue}
          onClick={onInputClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          id="add-labels-typeahead-input"
          autoComplete="off"
          innerRef={textInputRef}
          placeholder={
            mode === "add"
              ? "Type or select labels to add..."
              : "Type or select labels..."
          }
          {...(activeItemId && { "aria-activedescendant": activeItemId })}
          role="combobox"
          isExpanded={isSelectOpen}
          aria-controls="add-labels-typeahead-listbox"
        >
          <LabelGroup aria-label="Current selections" numLabels={5}>
            {selected.map((selection) => (
              <Label
                key={selection}
                variant="outline"
                onClose={(ev) => {
                  ev.stopPropagation();
                  onSelect(selection);
                }}
              >
                {selection}
              </Label>
            ))}
          </LabelGroup>
        </TextInputGroupMain>
        {selected.length > 0 && (
          <TextInputGroupUtilities>
            <Button
              variant="plain"
              onClick={onClearButtonClick}
              aria-label="Clear input value"
              icon={<TimesIcon />}
            />
          </TextInputGroupUtilities>
        )}
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Form
      id="add-labels-form"
      onSubmit={(e) => {
        void createLabel(e);
      }}
    >
      <FormGroup label="Labels" fieldId="add-labels-typeahead-input">
        <Select
          id="add-labels-typeahead-select"
          isOpen={isSelectOpen}
          selected={selected}
          onSelect={(_event, selection) => onSelect(selection as string)}
          onOpenChange={(open) => {
            if (!open) closeMenu();
          }}
          toggle={toggle}
          variant="typeahead"
        >
          <SelectList isAriaMultiselectable id="add-labels-typeahead-listbox">
            {selectOptions.map((option, index) => (
              <SelectOption
                key={option.value || option.children}
                isFocused={focusedItemIndex === index}
                className={option.className}
                id={createItemId(String(option.value))}
                {...option}
                ref={null}
              />
            ))}
          </SelectList>
        </Select>
        <FormFieldHelperText errorMessage={errors.label?.message} />
      </FormGroup>
    </Form>
  );
};

AddLabelsForm.displayName = "AddLabelsForm";
