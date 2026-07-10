export type TextFilterAttribute = {
  id: string;
  label: string;
  type: "text";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
};

export type CheckboxFilterOption = {
  value: string;
  label: string;
};

type CheckboxFilterAttributeBase = {
  id: string;
  label: string;
  options: CheckboxFilterOption[];
  selections: string[];
  onSelectionsChange: (selections: string[]) => void;
  onOpen?: () => void;
};

export type CheckboxFilterAttribute = CheckboxFilterAttributeBase & {
  type: "checkbox";
};

export type SearchableCheckboxFilterAttribute = CheckboxFilterAttributeBase & {
  type: "searchable-checkbox";
  searchPlaceholder?: string;
  emptyMessage?: string;
};

export type AttributeValueFilterAttribute =
  | TextFilterAttribute
  | CheckboxFilterAttribute
  | SearchableCheckboxFilterAttribute;
