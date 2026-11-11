import "@testing-library/jest-dom";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RecommendationTemplate } from "../RecommendationTemplate.js";

afterEach(() => cleanup());

describe("RecommendationTemplate", () => {
  it("shows the form and hides results until submit", () => {
    render(
      <RecommendationTemplate
        id="architecture"
        preferencesContent={<div>Form fields</div>}
        resultsContent={<div>Results panel</div>}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByText("Form fields")).toBeInTheDocument();
    expect(screen.queryByText("Results panel")).not.toBeInTheDocument();
  });

  it("replaces the form with results after submit", () => {
    const onGenerate = vi.fn();
    render(
      <RecommendationTemplate
        id="architecture"
        preferencesContent={<div>Form fields</div>}
        resultsContent={<div>Results panel</div>}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Generate recommendation" }),
    );

    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Results panel")).toBeInTheDocument();
    expect(screen.queryByText("Form fields")).not.toBeInTheDocument();
  });

  it("starts on results when initialShowResults is set", () => {
    render(
      <RecommendationTemplate
        id="architecture"
        preferencesContent={<div>Form fields</div>}
        resultsContent={<div>Results panel</div>}
        onGenerate={vi.fn()}
        initialShowResults
        isPreferencesDisabled
      />,
    );

    expect(screen.getByText("Results panel")).toBeInTheDocument();
    expect(screen.queryByText("Form fields")).not.toBeInTheDocument();
  });

  it("returns to the form with an error when onGenerate rejects (uncontrolled)", async () => {
    const onGenerate = vi.fn().mockRejectedValue(new Error("API unavailable"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <RecommendationTemplate
        id="architecture"
        preferencesContent={<div>Form fields</div>}
        resultsContent={<div>Results panel</div>}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Generate recommendation" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Form fields")).toBeInTheDocument();
    });
    expect(screen.queryByText("Results panel")).not.toBeInTheDocument();
    expect(screen.getByText("API unavailable")).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it("does not force form recovery when onGenerate rejects under controlled phase", async () => {
    const onGenerate = vi.fn().mockRejectedValue(new Error("API unavailable"));
    const onPhaseChange = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <RecommendationTemplate
        id="architecture"
        preferencesContent={<div>Form fields</div>}
        resultsContent={<div>Results panel</div>}
        onGenerate={onGenerate}
        phase="form"
        onPhaseChange={onPhaseChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Generate recommendation" }),
    );

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalled();
    });
    expect(onPhaseChange).toHaveBeenCalledWith("results");
    expect(screen.getByText("Form fields")).toBeInTheDocument();
    expect(screen.queryByText("API unavailable")).not.toBeInTheDocument();

    consoleError.mockRestore();
  });

  it("notifies the parent when the controlled phase should change", () => {
    const onPhaseChange = vi.fn();
    render(
      <RecommendationTemplate
        id="architecture"
        preferencesContent={<div>Form fields</div>}
        resultsContent={<div>Results panel</div>}
        onGenerate={vi.fn()}
        phase="form"
        onPhaseChange={onPhaseChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Generate recommendation" }),
    );

    expect(onPhaseChange).toHaveBeenCalledWith("results");
  });
});
