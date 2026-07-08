import { css } from "@emotion/css";
import {
  Badge,
  Checkbox,
  Dropdown,
  MenuToggle,
  type MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from "@patternfly/react-core";
import { RhUiFilterIcon } from "@patternfly/react-icons";
import type React from "react";
import { useMemo, useState } from "react";

import type {
  AttributeValueFilterAttribute,
  CheckboxFilterAttribute,
  CheckboxFilterOption,
  SearchableCheckboxFilterAttribute,
  TextFilterAttribute,
} from "./types";

const searchInputStyle = css`
  min-width: 300px;
  width: 300px;
`;

const valueToggleStyle = css`
  min-width: 300px;
`;

const searchableCheckboxMenuStyle = css`
  padding: 8px 16px 0;
`;

const searchableCheckboxListStyle = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px 16px;
  max-height: 300px;
  overflow-y: auto;
`;

const searchableCheckboxEmptyStyle = css`
  padding: 8px 16px 16px;
  color: var(--pf-t--global--text--color--subtle);
`;

export type AttributeValueFilterProps = {
  attributes: AttributeValueFilterAttribute[];
  defaultActiveAttributeId?: string;
  searchInputClassName?: string;
};

const getOptionLabel = (
  attribute: CheckboxFilterAttribute | SearchableCheckboxFilterAttribute,
  value: string,
): string =>
  attribute.options.find((option) => option.value === value)?.label ?? value;

const toSelectValue = (
  value: string | number | undefined,
): string | undefined => {
  if (typeof value === "undefined") {
    return undefined;
  }
  return typeof value === "string" ? value : String(value);
};

const filterOptionsBySearch = (
  options: CheckboxFilterOption[],
  searchValue: string,
): CheckboxFilterOption[] => {
  const query = searchValue.trim().toLowerCase();
  if (!query) {
    return options;
  }
  return options.filter((option) => option.label.toLowerCase().includes(query));
};

const TextValueFilter: React.FC<{
  attribute: TextFilterAttribute;
  isActive: boolean;
  className?: string;
}> = ({ attribute, isActive, className }) => (
  <ToolbarFilter
    labels={attribute.value !== "" ? [attribute.value] : []}
    deleteLabel={() => attribute.onChange("")}
    deleteLabelGroup={() => attribute.onChange("")}
    categoryName={attribute.label}
    showToolbarItem={isActive}
  >
    <SearchInput
      id={`attribute-value-filter-${attribute.id}`}
      aria-label={
        attribute.ariaLabel ?? `Filter by ${attribute.label.toLowerCase()}`
      }
      placeholder={
        attribute.placeholder ?? `Filter by ${attribute.label.toLowerCase()}`
      }
      value={attribute.value}
      onChange={(_event, value) => attribute.onChange(value)}
      onClear={() => attribute.onChange("")}
      className={className ?? searchInputStyle}
    />
  </ToolbarFilter>
);

const useCheckboxFilterLabels = (
  attribute: CheckboxFilterAttribute | SearchableCheckboxFilterAttribute,
) =>
  attribute.selections.map((value) => ({
    key: value,
    node: getOptionLabel(attribute, value),
  }));

const useCheckboxFilterHandlers = (
  attribute: CheckboxFilterAttribute | SearchableCheckboxFilterAttribute,
) => {
  const toggleSelection = (value: string): void => {
    const nextSelections = attribute.selections.includes(value)
      ? attribute.selections.filter((selection) => selection !== value)
      : [value, ...attribute.selections];
    attribute.onSelectionsChange(nextSelections);
  };

  const removeSelection = (
    label: string | { key: string; node: React.ReactNode },
  ): void => {
    const valueToRemove =
      typeof label === "object" && "key" in label
        ? label.key
        : attribute.options.find((option) => option.label === label)?.value;
    if (!valueToRemove) {
      return;
    }
    attribute.onSelectionsChange(
      attribute.selections.filter((selection) => selection !== valueToRemove),
    );
  };

  const labels = useCheckboxFilterLabels(attribute);

  return { toggleSelection, removeSelection, labels };
};

const CheckboxValueFilter: React.FC<{
  attribute: CheckboxFilterAttribute;
  isActive: boolean;
}> = ({ attribute, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toggleSelection, removeSelection, labels } =
    useCheckboxFilterHandlers(attribute);

  const handleOpenChange = (open: boolean): void => {
    setIsOpen(open);
    if (open) {
      attribute.onOpen?.();
    }
  };

  return (
    <ToolbarFilter
      labels={labels}
      deleteLabel={(_category, label) => removeSelection(label)}
      deleteLabelGroup={() => attribute.onSelectionsChange([])}
      categoryName={attribute.label}
      showToolbarItem={isActive}
    >
      <Select
        isOpen={isOpen}
        selected={attribute.selections}
        onSelect={(_event, value: string | number | undefined) => {
          const selectedValue = toSelectValue(value);
          if (!selectedValue) {
            return;
          }
          toggleSelection(selectedValue);
        }}
        onOpenChange={handleOpenChange}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => handleOpenChange(!isOpen)}
            isExpanded={isOpen}
            className={valueToggleStyle}
            {...(attribute.selections.length > 0 && {
              badge: <Badge isRead>{attribute.selections.length}</Badge>,
            })}
          >
            {`Filter by ${attribute.label.toLowerCase()}`}
          </MenuToggle>
        )}
      >
        <SelectList>
          {attribute.options.map((option) => (
            <SelectOption
              key={option.value}
              value={option.value}
              hasCheckbox
              isSelected={attribute.selections.includes(option.value)}
            >
              {option.label}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    </ToolbarFilter>
  );
};

const SearchableCheckboxValueFilter: React.FC<{
  attribute: SearchableCheckboxFilterAttribute;
  isActive: boolean;
}> = ({ attribute, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { toggleSelection, removeSelection, labels } =
    useCheckboxFilterHandlers(attribute);

  const filteredOptions = useMemo(
    () => filterOptionsBySearch(attribute.options, searchValue),
    [attribute.options, searchValue],
  );

  const handleOpenChange = (open: boolean): void => {
    setIsOpen(open);
    if (open) {
      attribute.onOpen?.();
      return;
    }
    setSearchValue("");
  };

  return (
    <ToolbarFilter
      labels={labels}
      deleteLabel={(_category, label) => removeSelection(label)}
      deleteLabelGroup={() => attribute.onSelectionsChange([])}
      categoryName={attribute.label}
      showToolbarItem={isActive}
    >
      <Dropdown
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        isScrollable
        maxMenuHeight="360px"
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => handleOpenChange(!isOpen)}
            isExpanded={isOpen}
            className={valueToggleStyle}
            {...(attribute.selections.length > 0 && {
              badge: <Badge isRead>{attribute.selections.length}</Badge>,
            })}
          >
            {`Filter by ${attribute.label.toLowerCase()}`}
          </MenuToggle>
        )}
      >
        <div className={searchableCheckboxMenuStyle}>
          <SearchInput
            aria-label={
              attribute.searchPlaceholder ??
              `Filter ${attribute.label.toLowerCase()} options`
            }
            placeholder={
              attribute.searchPlaceholder ??
              `Filter ${attribute.label.toLowerCase()} options`
            }
            value={searchValue}
            onChange={(_event, value) => setSearchValue(value)}
            onClear={() => setSearchValue("")}
          />
        </div>
        {filteredOptions.length === 0 ? (
          <div className={searchableCheckboxEmptyStyle}>
            {attribute.emptyMessage ?? "No options match this search"}
          </div>
        ) : (
          <div className={searchableCheckboxListStyle}>
            {filteredOptions.map((option) => (
              <Checkbox
                key={option.value}
                id={`${attribute.id}-${option.value}`}
                label={option.label}
                isChecked={attribute.selections.includes(option.value)}
                onChange={() => toggleSelection(option.value)}
              />
            ))}
          </div>
        )}
      </Dropdown>
    </ToolbarFilter>
  );
};

export const AttributeValueFilter: React.FC<AttributeValueFilterProps> = ({
  attributes,
  defaultActiveAttributeId,
  searchInputClassName,
}) => {
  const [activeAttributeId, setActiveAttributeId] = useState(
    defaultActiveAttributeId ?? attributes[0]?.id ?? "",
  );
  const [isAttributeSelectOpen, setIsAttributeSelectOpen] = useState(false);

  const resolvedActiveAttributeId = attributes.some(
    (attribute) => attribute.id === activeAttributeId,
  )
    ? activeAttributeId
    : (attributes[0]?.id ?? "");

  const activeAttribute =
    attributes.find(
      (attribute) => attribute.id === resolvedActiveAttributeId,
    ) ?? attributes[0];

  const renderValueFilter = (attribute: AttributeValueFilterAttribute) => {
    if (attribute.type === "text") {
      return (
        <TextValueFilter
          key={attribute.id}
          attribute={attribute}
          isActive={resolvedActiveAttributeId === attribute.id}
          className={searchInputClassName}
        />
      );
    }
    if (attribute.type === "searchable-checkbox") {
      return (
        <SearchableCheckboxValueFilter
          key={attribute.id}
          attribute={attribute}
          isActive={resolvedActiveAttributeId === attribute.id}
        />
      );
    }
    return (
      <CheckboxValueFilter
        key={attribute.id}
        attribute={attribute}
        isActive={resolvedActiveAttributeId === attribute.id}
      />
    );
  };

  return (
    <ToolbarToggleGroup toggleIcon={<RhUiFilterIcon />} breakpoint="xl">
      <ToolbarGroup variant="filter-group">
        <ToolbarItem>
          <Select
            isOpen={isAttributeSelectOpen}
            selected={resolvedActiveAttributeId}
            onSelect={(_event, value: string | number | undefined) => {
              const selectedValue = toSelectValue(value);
              if (!selectedValue) {
                return;
              }
              setActiveAttributeId(selectedValue);
              setIsAttributeSelectOpen(false);
            }}
            onOpenChange={setIsAttributeSelectOpen}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsAttributeSelectOpen((open) => !open)}
                isExpanded={isAttributeSelectOpen}
                icon={<RhUiFilterIcon />}
              >
                {activeAttribute?.label ?? "Filter"}
              </MenuToggle>
            )}
          >
            <SelectList>
              {attributes.map((attribute) => (
                <SelectOption key={attribute.id} value={attribute.id}>
                  {attribute.label}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </ToolbarItem>
        {attributes.map((attribute) => renderValueFilter(attribute))}
      </ToolbarGroup>
    </ToolbarToggleGroup>
  );
};

AttributeValueFilter.displayName = "AttributeValueFilter";
