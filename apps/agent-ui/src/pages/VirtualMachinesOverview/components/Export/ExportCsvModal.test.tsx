import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExportCsvModal } from "./ExportCsvModal";
import { PROCESSES_EXPORT_SCOPE_ID } from "./exportScopes";

describe("ExportCsvModal", () => {
  it("exports with Excel format by default", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(<ExportCsvModal isOpen onClose={vi.fn()} onExport={onExport} />);

    await user.click(screen.getByRole("button", { name: /Export \(1\)/i }));

    expect(onExport).toHaveBeenCalledWith(["overview"], "xlsx");
  });

  it("passes ZIP format when ZIP is selected", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(<ExportCsvModal isOpen onClose={vi.fn()} onExport={onExport} />);

    await user.click(screen.getByLabelText(/ZIP \(CSV files\)/i));
    await user.click(screen.getByRole("button", { name: /Export \(1\)/i }));

    expect(onExport).toHaveBeenCalledWith(["overview"], "zip");
  });

  it("resets format to Excel when the modal reopens", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    const { rerender } = render(
      <ExportCsvModal isOpen onClose={vi.fn()} onExport={onExport} />,
    );

    await user.click(screen.getByLabelText(/ZIP \(CSV files\)/i));

    rerender(
      <ExportCsvModal isOpen={false} onClose={vi.fn()} onExport={onExport} />,
    );
    rerender(<ExportCsvModal isOpen onClose={vi.fn()} onExport={onExport} />);

    await user.click(screen.getByRole("button", { name: /Export \(1\)/i }));

    expect(onExport).toHaveBeenCalledWith(["overview"], "xlsx");
  });

  it("passes selected scopes including VM processes to onExport", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(<ExportCsvModal isOpen onClose={vi.fn()} onExport={onExport} />);

    await user.click(screen.getByLabelText("VM processes"));
    await user.click(screen.getByRole("button", { name: /Export \(2\)/i }));

    expect(onExport).toHaveBeenCalledWith(
      ["overview", PROCESSES_EXPORT_SCOPE_ID],
      "xlsx",
    );
  });

  it("shows guidance when VM processes are selected", async () => {
    const user = userEvent.setup();

    render(<ExportCsvModal isOpen onClose={vi.fn()} onExport={vi.fn()} />);

    await user.click(screen.getByLabelText("VM processes"));

    expect(
      screen.getByText(/Some virtual machines may not include process data/i),
    ).toBeInTheDocument();
  });
});
