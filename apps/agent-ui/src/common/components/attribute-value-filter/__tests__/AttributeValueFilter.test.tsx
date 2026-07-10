import "@testing-library/jest-dom";

import { Toolbar, ToolbarContent } from "@patternfly/react-core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { useMemo, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AttributeValueFilter } from "../AttributeValueFilter";
import type { AttributeValueFilterAttribute } from "../types";

type HarnessProps = {
  defaultActiveAttributeId?: string;
};

const FilterHarness: React.FC<HarnessProps> = ({
  defaultActiveAttributeId = "name",
}) => {
  const [search, setSearch] = useState("");
  const [statusSelections, setStatusSelections] = useState<string[]>([]);

  const clearAllFilters = (): void => {
    setSearch("");
    setStatusSelections([]);
  };

  const attributes = useMemo(
    (): AttributeValueFilterAttribute[] => [
      {
        id: "name",
        label: "Name",
        type: "text",
        value: search,
        onChange: setSearch,
        placeholder: "Filter by name",
        ariaLabel: "Filter by name",
      },
      {
        id: "status",
        label: "Status",
        type: "checkbox",
        options: [
          { value: "running", label: "Running" },
          { value: "stopped", label: "Stopped" },
        ],
        selections: statusSelections,
        onSelectionsChange: setStatusSelections,
      },
    ],
    [search, statusSelections],
  );

  return (
    <>
      <Toolbar clearAllFilters={clearAllFilters}>
        <ToolbarContent>
          <AttributeValueFilter
            attributes={attributes}
            defaultActiveAttributeId={defaultActiveAttributeId}
          />
        </ToolbarContent>
      </Toolbar>
      <div data-testid="search-value">{search}</div>
      <div data-testid="status-selections">{statusSelections.join(",")}</div>
    </>
  );
};

const getAttributeToggle = (label: string): HTMLElement => {
  const toggles = screen.getAllByRole("button", { name: label });
  const menuToggle = toggles.find((button) =>
    button.classList.contains("pf-v6-c-menu-toggle"),
  );
  if (!menuToggle) {
    throw new Error(`Attribute toggle not found for label: ${label}`);
  }
  return menuToggle;
};

const openAttributeSelector = async (
  user: ReturnType<typeof userEvent.setup>,
  currentAttributeLabel = "Name",
): Promise<void> => {
  await user.click(getAttributeToggle(currentAttributeLabel));
};

const selectAttribute = async (
  user: ReturnType<typeof userEvent.setup>,
  attributeLabel: string,
  currentAttributeLabel = "Name",
): Promise<void> => {
  await openAttributeSelector(user, currentAttributeLabel);
  await user.click(screen.getByRole("option", { name: attributeLabel }));
};

const selectCheckboxOption = async (
  user: ReturnType<typeof userEvent.setup>,
  optionLabel: string,
): Promise<void> => {
  await user.click(screen.getByRole("checkbox", { name: optionLabel }));
};

afterEach(() => {
  cleanup();
});

describe("AttributeValueFilter", () => {
  it("shows the text value control for the default active attribute", () => {
    render(<FilterHarness />);

    expect(
      screen.getByRole("textbox", { name: "Filter by name" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Filter by status" }),
    ).not.toBeInTheDocument();
  });

  it("applies a text filter value", async () => {
    const user = userEvent.setup();
    render(<FilterHarness />);

    await user.type(
      screen.getByRole("textbox", { name: "Filter by name" }),
      "alpha",
    );

    expect(screen.getByTestId("search-value")).toHaveTextContent("alpha");
    expect(
      screen.getByRole("button", { name: "Close alpha" }),
    ).toBeInTheDocument();
  });

  it("switches the visible value control when the active attribute changes", async () => {
    const user = userEvent.setup();
    render(<FilterHarness />);

    await selectAttribute(user, "Status");

    expect(
      screen.getByRole("button", { name: "Filter by status" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "Filter by name" }),
    ).not.toBeInTheDocument();
  });

  it("applies checkbox selections", async () => {
    const user = userEvent.setup();
    render(<FilterHarness />);

    await selectAttribute(user, "Status");
    await user.click(screen.getByRole("button", { name: "Filter by status" }));
    await selectCheckboxOption(user, "Running");

    expect(screen.getByTestId("status-selections")).toHaveTextContent(
      "running",
    );
    expect(
      screen.getByRole("button", { name: "Close Running" }),
    ).toBeInTheDocument();
  });

  it("removes a checkbox filter chip", async () => {
    const user = userEvent.setup();
    render(<FilterHarness />);

    await selectAttribute(user, "Status");
    await user.click(screen.getByRole("button", { name: "Filter by status" }));
    await selectCheckboxOption(user, "Stopped");
    expect(screen.getByTestId("status-selections")).toHaveTextContent(
      "stopped",
    );

    await user.click(screen.getByRole("button", { name: "Close Stopped" }));

    expect(screen.getByTestId("status-selections")).toHaveTextContent("");
    expect(
      screen.queryByRole("button", { name: "Close Stopped" }),
    ).not.toBeInTheDocument();
  });

  it("clears all filters from the toolbar action", async () => {
    const user = userEvent.setup();
    render(<FilterHarness />);

    await user.type(
      screen.getByRole("textbox", { name: "Filter by name" }),
      "alpha",
    );
    await selectAttribute(user, "Status");
    await user.click(screen.getByRole("button", { name: "Filter by status" }));
    await selectCheckboxOption(user, "Running");

    await user.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(screen.getByTestId("search-value")).toHaveTextContent("");
    expect(screen.getByTestId("status-selections")).toHaveTextContent("");
    expect(
      screen.queryByRole("button", { name: "Close alpha" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Close Running" }),
    ).not.toBeInTheDocument();
  });

  it("removes a text filter chip without clearing the textbox value", async () => {
    const user = userEvent.setup();
    render(<FilterHarness />);

    await user.type(
      screen.getByRole("textbox", { name: "Filter by name" }),
      "alpha",
    );

    await user.click(screen.getByRole("button", { name: "Close alpha" }));

    expect(screen.getByTestId("search-value")).toHaveTextContent("");
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
  });

  it("removes the correct checkbox chip when option labels are duplicated", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    const DuplicateLabelHarness: React.FC = () => {
      const [selections, setSelections] = useState<string[]>(["vm-a", "vm-b"]);

      const attributes = useMemo(
        (): AttributeValueFilterAttribute[] => [
          {
            id: "virtual-machine",
            label: "Virtual machine",
            type: "checkbox",
            options: [
              { value: "vm-a", label: "web-01" },
              { value: "vm-b", label: "web-01" },
            ],
            selections,
            onSelectionsChange: setSelections,
            onOpen,
          },
        ],
        [selections],
      );

      return (
        <>
          <Toolbar>
            <ToolbarContent>
              <AttributeValueFilter attributes={attributes} />
            </ToolbarContent>
          </Toolbar>
          <div data-testid="selections">{selections.join(",")}</div>
        </>
      );
    };

    render(<DuplicateLabelHarness />);

    const closeButtons = screen.getAllByRole("button", {
      name: "Close web-01",
    });
    await user.click(closeButtons[1]);

    expect(screen.getByTestId("selections")).toHaveTextContent("vm-a");
    expect(
      screen.getAllByRole("button", { name: "Close web-01" }),
    ).toHaveLength(1);
  });

  it("filters searchable checkbox options and calls onOpen", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    const SearchableHarness: React.FC = () => {
      const [selections, setSelections] = useState<string[]>([]);

      const attributes = useMemo(
        (): AttributeValueFilterAttribute[] => [
          {
            id: "virtual-machine",
            label: "Virtual machine",
            type: "searchable-checkbox",
            options: [
              { value: "vm-a", label: "Alpha VM" },
              { value: "vm-b", label: "Beta VM" },
            ],
            selections,
            onSelectionsChange: setSelections,
            onOpen,
            searchPlaceholder: "Type to filter VMs",
          },
        ],
        [selections],
      );

      return (
        <>
          <Toolbar>
            <ToolbarContent>
              <AttributeValueFilter attributes={attributes} />
            </ToolbarContent>
          </Toolbar>
          <div data-testid="selections">{selections.join(",")}</div>
        </>
      );
    };

    render(<SearchableHarness />);

    await user.click(
      screen.getByRole("button", { name: "Filter by virtual machine" }),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);

    await user.type(
      screen.getByRole("textbox", { name: "Type to filter VMs" }),
      "beta",
    );
    expect(
      screen.queryByRole("checkbox", { name: "Alpha VM" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Beta VM" }));

    expect(screen.getByTestId("selections")).toHaveTextContent("vm-b");
  });
});
