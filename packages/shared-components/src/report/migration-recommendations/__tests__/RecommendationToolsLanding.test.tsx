import "@testing-library/jest-dom";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getRecommendationToolCards } from "../constants.js";
import { RecommendationToolsLanding } from "../RecommendationToolsLanding.js";

afterEach(() => cleanup());

describe("RecommendationToolsLanding", () => {
  it("renders the heading, description, and environment-wide cards", () => {
    const onSelectTool = vi.fn();
    render(
      <RecommendationToolsLanding
        tools={getRecommendationToolCards({ isAggregateView: true })}
        onSelectTool={onSelectTool}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Migration recommendations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Use recommendations tool for additional migration information.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Migration time estimation")).toBeInTheDocument();
    expect(screen.getByText("Migration complexity")).toBeInTheDocument();
    expect(
      screen.getByText("OpenShift cluster architecture"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Open OpenShift cluster architecture tool",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Migration plan")).not.toBeInTheDocument();
  });

  it("opens a tool when Open tool is clicked", () => {
    const onSelectTool = vi.fn();
    render(
      <RecommendationToolsLanding
        tools={getRecommendationToolCards({ isAggregateView: true })}
        onSelectTool={onSelectTool}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open Migration time estimation tool",
      }),
    );

    expect(onSelectTool).toHaveBeenCalledWith("time-estimation");
  });

  it("renders cost estimation for partners", () => {
    render(
      <RecommendationToolsLanding
        tools={getRecommendationToolCards({
          isAggregateView: false,
          isPartner: true,
        })}
        onSelectTool={vi.fn()}
      />,
    );

    expect(screen.getByText("Cost estimation")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Cost estimation tool" }),
    ).toBeInTheDocument();
  });
});
