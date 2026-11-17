import "@testing-library/jest-dom";

import { Drawer, DrawerContent } from "@patternfly/react-core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApplicationVmsDrawer } from "./ApplicationVmsDrawer";
import type { ApplicationOverview } from "./applicationsApi";

vi.mock("../../../../store/api/vmsEndpoints", () => ({
  useGetApplicationDrawerVmsQuery: () => ({
    data: undefined,
    isLoading: false,
    error: undefined,
  }),
}));

const application: ApplicationOverview = {
  name: "Active Directory Domain Services",
  description: "",
  vendor: "Microsoft",
  category: "Directory service",
  vmCount: 3,
  vms: [
    { id: "vm-1", name: "win10-rvtools" },
    { id: "vm-2", name: "eco-ansible-windows-sccm-2022" },
    { id: "vm-3", name: "eco-vcenter-server" },
  ],
};

function renderDrawer() {
  return render(
    <Drawer isExpanded>
      <DrawerContent
        panelContent={
          <ApplicationVmsDrawer application={application} onClose={vi.fn()} />
        }
      />
    </Drawer>,
  );
}

function getSelectAllCheckbox() {
  return screen.getByRole("checkbox", { name: /select all rows/i });
}

describe("ApplicationVmsDrawer", () => {
  it("selects every VM from the header checkbox", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(getSelectAllCheckbox());

    expect(getSelectAllCheckbox()).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Actions (3)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Select row 0" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Select row 1" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Select row 2" }),
    ).toBeChecked();
  });

  it("deselects every VM from the header checkbox", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(getSelectAllCheckbox());
    await user.click(getSelectAllCheckbox());

    expect(getSelectAllCheckbox()).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Select row 0" }),
    ).not.toBeChecked();
  });

  it("shows an indeterminate header checkbox when some VMs are selected", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("checkbox", { name: "Select row 0" }));

    expect(getSelectAllCheckbox()).toBePartiallyChecked();
    expect(
      screen.getByRole("button", { name: "Actions (1)" }),
    ).toBeInTheDocument();
  });

  it("keeps the header indeterminate for a partial selection when the list is filtered", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("checkbox", { name: "Select row 0" }));
    await user.type(
      screen.getByPlaceholderText("Find by virtual machine name"),
      "vcenter",
    );

    expect(getSelectAllCheckbox()).toBePartiallyChecked();
    expect(
      screen.getByRole("button", { name: "Actions (1)" }),
    ).toBeInTheDocument();
  });

  it("selects every VM from the header checkbox even when the list is filtered", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.type(
      screen.getByPlaceholderText("Find by virtual machine name"),
      "vcenter",
    );
    await user.click(getSelectAllCheckbox());

    expect(getSelectAllCheckbox()).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Actions (3)" }),
    ).toBeInTheDocument();
  });
});
