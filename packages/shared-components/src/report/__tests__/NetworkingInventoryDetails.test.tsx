import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NetworkingInventoryDetails } from "../NetworkingInventoryDetails.js";

describe("NetworkingInventoryDetails", () => {
  it("renders summary metrics and filters the table by search", async () => {
    const user = userEvent.setup();
    render(
      <NetworkingInventoryDetails
        scopeLabel="Entire environment"
        networks={[
          {
            name: "vm_traffic",
            type: "distributed",
            vlanId: "386",
            vmsCount: 180,
          },
          { name: "vMotion", type: "distributed", vlanId: "375", vmsCount: 9 },
        ]}
      />,
    );

    expect(screen.getByText("Networking")).toBeInTheDocument();
    expect(screen.getByText("180")).toBeInTheDocument();
    expect(screen.getByText("vm_traffic")).toBeInTheDocument();
    expect(screen.getByText("vMotion")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search networks"), "vmo");
    expect(screen.queryByText("vm_traffic")).not.toBeInTheDocument();
    expect(screen.getByText("vMotion")).toBeInTheDocument();
  });

  it("shows empty state when no networks are present", () => {
    render(
      <NetworkingInventoryDetails
        scopeLabel="Entire environment"
        networks={[]}
      />,
    );
    expect(screen.getByText("Network data not collected")).toBeInTheDocument();
  });
});
