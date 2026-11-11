import "@testing-library/jest-dom";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RecommendationToolActions } from "../RecommendationToolActions.js";

afterEach(() => cleanup());

describe("RecommendationToolActions", () => {
  it("renders edit and copy actions", () => {
    const onEdit = vi.fn();
    const onCopy = vi.fn();
    render(
      <RecommendationToolActions
        isReadOnly={false}
        isEditDisabled={false}
        onEdit={onEdit}
        canCopy
        onCopy={onCopy}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Edit migration preferences" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy as plain text" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("hides edit in read-only mode", () => {
    render(
      <RecommendationToolActions
        isReadOnly
        isEditDisabled={false}
        onEdit={vi.fn()}
        canCopy={false}
        onCopy={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Edit migration preferences" }),
    ).not.toBeInTheDocument();
  });
});
