import { css } from "@emotion/css";
import {
  Button,
  Content,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const styles = {
  inputWrapper: css`
    position: relative;
  `,
  labelsInput: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    border: 1px solid var(--pf-t--global--border--color--default);
    border-radius: var(--pf-t--global--border--radius--small);
    min-height: 36px;
    cursor: text;
    &:focus-within {
      border-color: var(--pf-t--global--border--color--hover);
      outline: 2px solid var(--pf-t--global--color--brand--default);
      outline-offset: 1px;
    }
  `,
  textInput: css`
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    flex: 1;
    min-width: 120px;
    padding: 0 !important;
    background: transparent !important;
    &:focus {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
    }
  `,
  dropdown: css`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--pf-t--global--background--color--primary--default);
    border: 1px solid var(--pf-t--global--border--color--default);
    border-radius: var(--pf-t--global--border--radius--small);
    box-shadow: var(--pf-t--global--box-shadow--md);
    margin-top: 4px;
    max-height: 200px;
    overflow-y: auto;
  `,
  dropdownItem: css`
    display: block;
    width: 100%;
    padding: 8px 12px;
    cursor: pointer;
    background: none;
    border: none;
    text-align: left;
    font: inherit;
    &:hover {
      background: var(--pf-t--global--background--color--primary--hover);
    }
  `,
  dropdownItemHighlighted: css`
    display: block;
    width: 100%;
    padding: 8px 12px;
    cursor: pointer;
    background: var(--pf-t--global--background--color--primary--hover);
    border: none;
    text-align: left;
    font: inherit;
  `,
  dropdownSection: css`
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--pf-t--global--text--color--subtle);
  `,
};

function labelsMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function findExistingLabel(
  value: string,
  existingLabels: string[],
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return existingLabels.find((label) => labelsMatch(label, trimmed));
}

interface AddLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (labels: string[]) => Promise<void>;
  selectedVMCount: number;
  existingLabels: string[];
}

export const AddLabelsModal: React.FC<AddLabelsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedVMCount,
  existingLabels,
}) => {
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedLabels([]);
      setInputValue("");
      setIsDropdownOpen(false);
      setIsSubmitting(false);
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const unselectedExistingLabels = useMemo(
    () =>
      existingLabels.filter(
        (label) =>
          !selectedLabels.some((selected) => labelsMatch(selected, label)),
      ),
    [existingLabels, selectedLabels],
  );

  const matchingExistingLabels = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return unselectedExistingLabels;
    return unselectedExistingLabels.filter((label) =>
      label.toLowerCase().includes(query),
    );
  }, [inputValue, unselectedExistingLabels]);

  const showCreateOption = useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return false;
    const alreadyExists = findExistingLabel(trimmed, existingLabels);
    const alreadySelected = selectedLabels.some((l) => labelsMatch(l, trimmed));
    return !alreadyExists && !alreadySelected;
  }, [inputValue, existingLabels, selectedLabels]);

  const dropdownItems = useMemo(() => {
    const items: { type: "create" | "existing"; value: string }[] = [];
    for (const label of matchingExistingLabels) {
      items.push({ type: "existing", value: label });
    }
    if (showCreateOption) {
      items.push({ type: "create", value: inputValue.trim() });
    }
    return items;
  }, [matchingExistingLabels, showCreateOption, inputValue]);

  const addLabel = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;

      const canonical = findExistingLabel(trimmed, existingLabels) ?? trimmed;
      if (selectedLabels.some((l) => labelsMatch(l, canonical))) {
        setInputValue("");
        setHighlightedIndex(-1);
        inputRef.current?.focus();
        return;
      }

      setSelectedLabels((prev) => [...prev, canonical]);
      setInputValue("");
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [selectedLabels, existingLabels],
  );

  const removeLabel = useCallback((label: string) => {
    setSelectedLabels((prev) => prev.filter((l) => l !== label));
  }, []);

  const handleInputChange = (
    _event: React.FormEvent<HTMLInputElement>,
    value: string,
  ) => {
    setInputValue(value);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < dropdownItems.length) {
        addLabel(dropdownItems[highlightedIndex].value);
      } else if (inputValue.trim()) {
        const existing = findExistingLabel(inputValue, existingLabels);
        addLabel(existing ?? inputValue.trim());
      }
    } else if (
      event.key === "Backspace" &&
      !inputValue &&
      selectedLabels.length > 0
    ) {
      removeLabel(selectedLabels[selectedLabels.length - 1]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isDropdownOpen) setIsDropdownOpen(true);
      setHighlightedIndex((prev) =>
        prev < dropdownItems.length - 1 ? prev + 1 : prev,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (event.key === "Escape") {
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSubmit = async () => {
    if (selectedLabels.length === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(selectedLabels);
      onClose();
    } catch (err) {
      console.error("Error adding labels:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="add-labels-title"
      aria-describedby="add-labels-body"
      variant="medium"
    >
      <ModalHeader title="Add labels" labelId="add-labels-title" />
      <ModalBody
        id="add-labels-body"
        style={{ minHeight: "180px", overflow: "visible" }}
      >
        <Content component="p" style={{ marginBottom: "16px" }}>
          Applies to the {selectedVMCount} selected VM
          {selectedVMCount !== 1 ? "s" : ""}. You can add a custom label, or
          select an existing label.
        </Content>

        <div style={{ marginBottom: "8px" }}>
          <strong>Labels</strong>
        </div>

        <div className={styles.inputWrapper}>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: focus delegation to inner input */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by inner input */}
          <div
            className={styles.labelsInput}
            onClick={() => inputRef.current?.focus()}
          >
            {selectedLabels.length > 0 && (
              <LabelGroup>
                {selectedLabels.map((label) => (
                  <Label key={label} onClose={() => removeLabel(label)}>
                    {label}
                  </Label>
                ))}
              </LabelGroup>
            )}
            <TextInput
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsDropdownOpen(true)}
              aria-expanded={isDropdownOpen && dropdownItems.length > 0}
              aria-autocomplete="list"
              aria-controls="add-labels-suggestions"
              onBlur={() => {
                setTimeout(() => setIsDropdownOpen(false), 200);
              }}
              className={styles.textInput}
              aria-label="Type to add labels"
              placeholder="Search existing or type a new label..."
            />
          </div>

          {isDropdownOpen && dropdownItems.length > 0 && (
            <div
              id="add-labels-suggestions"
              className={styles.dropdown}
              role="listbox"
            >
              {matchingExistingLabels.length > 0 && (
                <div className={styles.dropdownSection}>Existing labels</div>
              )}
              {dropdownItems.map((item, index) => (
                <button
                  type="button"
                  key={`${item.type}-${item.value}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={
                    index === highlightedIndex
                      ? styles.dropdownItemHighlighted
                      : styles.dropdownItem
                  }
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addLabel(item.value);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {item.type === "create" ? (
                    <>Create label &quot;{item.value}&quot;</>
                  ) : (
                    item.value
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={selectedLabels.length === 0 || isSubmitting}
          isLoading={isSubmitting}
        >
          Add labels
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

AddLabelsModal.displayName = "AddLabelsModal";
