import "@testing-library/jest-dom";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MigrationRecommendationsView } from "../MigrationRecommendationsView.js";

afterEach(() => cleanup());

describe("MigrationRecommendationsView", () => {
  it("shows the tool landing when no tool is selected", () => {
    render(
      <MigrationRecommendationsView
        selectedTool={null}
        onSelectTool={vi.fn()}
        isAggregateView
        canOpenArchitecture
        renderSelectedTool={() => <div data-testid="tool-view" />}
      />,
    );

    expect(
      screen.getByText("OpenShift cluster architecture"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("tool-view")).not.toBeInTheDocument();
  });

  it("renders the selected tool via renderSelectedTool", () => {
    render(
      <MigrationRecommendationsView
        selectedTool="time-estimation"
        onSelectTool={vi.fn()}
        isAggregateView
        renderSelectedTool={(toolId) => (
          <div data-testid="tool-view">{toolId}</div>
        )}
      />,
    );

    expect(screen.getByTestId("tool-view")).toHaveTextContent(
      "time-estimation",
    );
  });
});
