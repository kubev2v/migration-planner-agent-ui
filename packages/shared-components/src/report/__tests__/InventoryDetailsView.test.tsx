import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InventoryDetailsView } from "../InventoryDetailsView.js";

describe("InventoryDetailsView", () => {
  it("renders the page title, description, and children", () => {
    render(
      <InventoryDetailsView>
        <div>Networking section</div>
      </InventoryDetailsView>,
    );

    expect(
      screen.getByRole("heading", { name: "Inventory details" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Explore networks, datastores, and hosts/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Networking section")).toBeInTheDocument();
  });
});
