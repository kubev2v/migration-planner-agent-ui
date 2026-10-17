import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExportCsvModal } from "./ExportCsvModal";

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
});
