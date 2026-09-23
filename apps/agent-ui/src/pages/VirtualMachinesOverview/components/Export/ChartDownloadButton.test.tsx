import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ChartDownloadButton,
  ChartDownloadProvider,
} from "./ChartDownloadButton";

describe("ChartDownloadButton", () => {
  it("hides when there is no download provider", () => {
    render(
      <ChartDownloadButton
        chartId="infra"
        title="Infrastructure summary"
        getNode={() => <div />}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: /download infrastructure summary as png/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("downloads the current chart spec", async () => {
    const user = userEvent.setup();
    const downloadChart = vi.fn().mockResolvedValue(undefined);
    const node = <div>export node</div>;

    render(
      <ChartDownloadProvider
        value={{
          downloadChart,
          downloadingChartId: null,
          isBusy: false,
        }}
      >
        <ChartDownloadButton
          chartId="infra"
          title="Infrastructure summary"
          getNode={() => node}
        />
      </ChartDownloadProvider>,
    );

    await user.click(
      screen.getByRole("button", {
        name: /download infrastructure summary as png/i,
      }),
    );

    expect(downloadChart).toHaveBeenCalledWith({
      id: "infra",
      title: "Infrastructure summary",
      filename: "infrastructure-summary.png",
      node,
    });
  });
});
