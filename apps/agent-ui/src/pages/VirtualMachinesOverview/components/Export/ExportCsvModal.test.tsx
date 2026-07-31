import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExportCsvModal } from "./ExportCsvModal";

describe("ExportCsvModal", () => {
  it("exports with ZIP format by default", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(<ExportCsvModal isOpen onClose={vi.fn()} onExport={onExport} />);

    await user.click(screen.getByRole("button", { name: /Export \(1\)/i }));

    expect(onExport).toHaveBeenCalledWith(["overview"], "zip");
  });

  it("keeps ZIP format when the modal reopens", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    const { rerender } = render(
      <ExportCsvModal isOpen onClose={vi.fn()} onExport={onExport} />,
    );

    rerender(
      <ExportCsvModal isOpen={false} onClose={vi.fn()} onExport={onExport} />,
    );
    rerender(<ExportCsvModal isOpen onClose={vi.fn()} onExport={onExport} />);

    await user.click(screen.getByRole("button", { name: /Export \(1\)/i }));

    expect(onExport).toHaveBeenCalledWith(["overview"], "zip");
  });

  it("includes selected scopes in the export", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(<ExportCsvModal isOpen onClose={vi.fn()} onExport={onExport} />);

    await user.click(screen.getByLabelText(/Hosts/i));
    await user.click(screen.getByRole("button", { name: /Export \(2\)/i }));

    expect(onExport).toHaveBeenCalledWith(["overview", "hosts"], "zip");
  });
});
