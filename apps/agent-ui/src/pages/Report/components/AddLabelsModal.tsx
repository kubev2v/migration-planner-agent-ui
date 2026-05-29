import {
  Button,
  Content,
  Label,
  LabelGroup,
  MenuToggle,
  type MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
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

const NO_RESULTS = "no-results";
const CREATE_NEW = "create-new";

interface AddLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (labelsToAdd: string[], labelsToRemove: string[]) => Promise<void>;
  selectedVMCount: number;
  existingLabels: string[];
  currentVMLabels?: string[];
  selectedVMName?: string;
  mode?: "add" | "edit";
}

export const AddLabelsModal: React.FC<AddLabelsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedVMCount,
  existingLabels,
  currentVMLabels = [],
  selectedVMName,
  mode = "add",
}) => {
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectOptions, setSelectOptions] = useState<SelectOptionProps[]>([]);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(undefined);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSelected(mode === "edit" ? [...currentVMLabels] : []);
      setInputValue("");
      setIsSelectOpen(false);
      setIsSubmitting(false);
      setFocusedItemIndex(null);
      setActiveItemId(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentVMLabels, mode]);

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

  const onSelect = (value: string) => {
    if (value === NO_RESULTS) return;

    if (value === CREATE_NEW) {
      const trimmed = inputValue.trim();
      if (trimmed && !selected.includes(trimmed)) {
        setSelected((prev) => [...prev, trimmed]);
      }
      setInputValue("");
      resetActiveAndFocusedItem();
      textInputRef.current?.focus();
      return;
    }

    if (selected.includes(value)) {
      setSelected((prev) => prev.filter((s) => s !== value));
    } else {
      setSelected((prev) => [...prev, value]);
    }
    textInputRef.current?.focus();
  };

  const onTextInputChange = (
    _event: React.FormEvent<HTMLInputElement>,
    value: string,
  ) => {
    setInputValue(value);
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
          onSelect(CREATE_NEW);
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
    setSelected([]);
    setInputValue("");
    resetActiveAndFocusedItem();
    textInputRef.current?.focus();
  };

  const labelsToAdd =
    mode === "add"
      ? selected
      : selected.filter((l) => !currentVMLabels.includes(l));
  const labelsToRemove =
    mode === "add" ? [] : currentVMLabels.filter((l) => !selected.includes(l));
  const hasChanges =
    mode === "add"
      ? selected.length > 0
      : labelsToAdd.length > 0 || labelsToRemove.length > 0;

  const handleSubmit = async () => {
    if (!hasChanges) return;
    setIsSubmitting(true);
    try {
      await onSubmit(labelsToAdd, labelsToRemove);
      onClose();
    } catch (err) {
      console.error("Error updating labels:", err);
    } finally {
      setIsSubmitting(false);
    }
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
        <TextInputGroupUtilities
          {...(selected.length === 0 ? { style: { display: "none" } } : {})}
        >
          <Button
            variant="plain"
            onClick={onClearButtonClick}
            aria-label="Clear input value"
            icon={<TimesIcon />}
          />
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="add-labels-title"
      aria-describedby="add-labels-body"
      variant="medium"
    >
      <ModalHeader
        title={mode === "edit" ? "Edit labels" : "Add labels"}
        labelId="add-labels-title"
      />
      <ModalBody id="add-labels-body" style={{ minHeight: "220px" }}>
        <Content component="p" style={{ marginBottom: "16px" }}>
          {mode === "edit" ? (
            selectedVMName ? (
              <>
                Add or remove labels for <strong>{selectedVMName}</strong>.
              </>
            ) : (
              "Add or remove labels for this virtual machine."
            )
          ) : (
            `Applies to the ${selectedVMCount} selected VM${selectedVMCount !== 1 ? "s" : ""}. Add one or more labels. Existing labels on those VMs are not shown and will not be changed.`
          )}
        </Content>

        <div style={{ marginBottom: "8px" }}>
          <strong>Labels</strong>
        </div>

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
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!hasChanges || isSubmitting}
          isLoading={isSubmitting}
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

AddLabelsModal.displayName = "AddLabelsModal";
