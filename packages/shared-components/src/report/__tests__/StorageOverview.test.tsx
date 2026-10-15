import "@testing-library/jest-dom";
import {
  chart_color_blue_300,
  chart_color_purple_100,
  chart_color_purple_300,
  chart_color_teal_300,
  chart_color_yellow_400,
} from "@patternfly/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MigrationDonutChartProps } from "../../charts/MigrationDonutChart.js";
import { StorageOverview } from "../StorageOverview.js";

const donutProps = vi.hoisted(() => ({
  current: null as MigrationDonutChartProps | null,
}));

vi.mock("../../charts/MigrationDonutChart.js", () => ({
  MigrationDonutChart: (props: MigrationDonutChartProps): JSX.Element => {
    donutProps.current = props;
    return (
      <div data-testid="storage-donut">
        {props.title} {props.subTitle}
      </div>
    );
  },
}));

afterEach(() => {
  donutProps.current = null;
  cleanup();
});

const renderedDonut = (): MigrationDonutChartProps => {
  const props = donutProps.current;
  if (!props) {
    throw new Error("expected a storage donut to render");
  }
  return props;
};

const selectView = async (name: string): Promise<void> => {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "VM count by disk size tier" }),
  );
  await user.click(screen.getByRole("menuitem", { name }));
};

describe("StorageOverview", () => {
  it("shows the storage empty state when no disk tiers were collected", () => {
    render(<StorageOverview />);

    expect(screen.getByText("Disks")).toBeInTheDocument();
    expect(screen.getByText("Storage data not collected")).toBeInTheDocument();
    expect(screen.queryByTestId("storage-donut")).not.toBeInTheDocument();
  });

  it("orders VM-count tiers and totals the VM count", () => {
    render(
      <StorageOverview
        diskSizeTier={{
          Hard: { vmCount: 3, totalSizeTB: 30 },
          Easy: { vmCount: 10, totalSizeTB: 5 },
          Medium: { vmCount: 6, totalSizeTB: 15 },
        }}
      />,
    );

    expect(screen.getByTestId("storage-donut")).toHaveTextContent("19 VMs");

    const props = renderedDonut();
    expect(props.data.map((slice) => [slice.name, slice.count])).toEqual([
      ["0-10 TB", 10],
      ["11-20 TB", 6],
      ["21-50 TB", 3],
    ]);
    expect(props.data[0]?.countDisplay).toBe("10 VMs");
    expect(props.legend).toEqual({
      Easy: chart_color_blue_300.value,
      Medium: chart_color_purple_300.value,
      Hard: chart_color_purple_100.value,
    });
    expect(props.legendVariant).toBe("html");
    expect(props.subTitleColor).toBe(
      "var(--pf-t--global--text--color--subtle)",
    );
  });

  it("switches to total disk size and formats TB totals", async () => {
    render(
      <StorageOverview
        diskSizeTier={{
          Easy: { vmCount: 10, totalSizeTB: 5.5 },
          Medium: { vmCount: 6, totalSizeTB: 15 },
        }}
      />,
    );

    await selectView("Total disk size by tier");

    const props = renderedDonut();
    expect(props.title).toBe("20.50 TB");
    expect(props.subTitle).toBe("16 VMs");
    expect(props.data[0]?.countDisplay).toBe("5.50 TB");
  });

  it("drills down into a disk-size range when a tier slice is clicked", () => {
    const onDiskTierSelect = vi.fn();
    render(
      <StorageOverview
        diskSizeTier={{ Easy: { vmCount: 10, totalSizeTB: 5 } }}
        onDiskTierSelect={onDiskTierSelect}
      />,
    );

    const props = renderedDonut();
    const slice = props.data[0];
    if (!slice) {
      throw new Error("expected a tier slice");
    }
    props.onItemClick?.(slice);

    expect(onDiskTierSelect).toHaveBeenCalledWith({
      min: 0,
      max: 10 * 1024 * 1024,
    });
  });

  it("renders the disk-type bar chart and its empty state", async () => {
    const { rerender } = render(
      <StorageOverview
        diskTypes={{ NFS: { vmCount: 2 }, VMFS: { vmCount: 5 } }}
      />,
    );

    await selectView("VM count by disk type");

    // Preferred order places VMFS before NFS.
    const vmfs = screen.getByText("VMFS");
    const nfs = screen.getByText("NFS");
    expect(vmfs.compareDocumentPosition(nfs)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      screen.getByText(/Totals may exceed the unique VM count/),
    ).toBeInTheDocument();

    rerender(<StorageOverview diskTypes={{}} />);
    expect(
      screen.getByText("Disk type data not collected"),
    ).toBeInTheDocument();
  });

  it("renders the shared-disks donut", async () => {
    render(<StorageOverview totalVMs={10} totalWithSharedDisks={4} />);

    await selectView("Shared disks VS. No shared disks");

    const props = renderedDonut();
    expect(props.title).toBe("10 VMs");
    expect(props.subTitle).toBe("4 with shared disks");
    expect(props.data.map((slice) => [slice.name, slice.count])).toEqual([
      ["With shared disks", 4],
      ["No shared disks", 6],
    ]);
    expect(props.customColors).toEqual({
      "With shared disks": chart_color_yellow_400.value,
      "No shared disks": chart_color_blue_300.value,
    });
  });

  it("disables the shared-disks view when no VMs have shared disks", async () => {
    const user = userEvent.setup();
    render(<StorageOverview totalVMs={10} totalWithSharedDisks={0} />);

    await user.click(
      screen.getByRole("button", { name: "VM count by disk size tier" }),
    );
    const sharedItem = screen.getByRole("menuitem", {
      name: "Shared disks VS. No shared disks",
    });
    expect(sharedItem).toBeDisabled();

    await user.click(sharedItem);
    // The disabled item does not switch the active view.
    expect(
      screen.getByRole("button", { name: "VM count by disk size tier" }),
    ).toBeInTheDocument();
  });

  it("passes the chart legend variant through", () => {
    render(
      <StorageOverview
        legendVariant="chart"
        diskSizeTier={{ Easy: { vmCount: 2, totalSizeTB: 1 } }}
      />,
    );

    expect(renderedDonut().legendVariant).toBe("chart");
  });

  it("keeps the configured tier palette aligned with the categorical order", () => {
    render(
      <StorageOverview
        diskSizeTier={{
          Easy: { vmCount: 1 },
          Medium: { vmCount: 1 },
          Hard: { vmCount: 1 },
          White: { vmCount: 1 },
        }}
      />,
    );

    expect(renderedDonut().legend).toEqual({
      Easy: chart_color_blue_300.value,
      Medium: chart_color_purple_300.value,
      Hard: chart_color_purple_100.value,
      "White glove": chart_color_teal_300.value,
    });
  });
});
