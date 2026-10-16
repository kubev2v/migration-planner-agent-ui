import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import type { DefaultApiInterface } from "../../../../api/agentApi";
import { MAX_LABEL_LENGTH } from "./labelValidation";
import { ManageLabelsModal } from "./ManageLabelsModal";

const createAgentApi = () =>
  ({
    getLatestVMLabels: vi.fn().mockResolvedValue({
      labels: ["prod"],
      counts: [2],
    }),
    deleteLatestLabelGlobally: vi.fn().mockResolvedValue({}),
    listLatestVirtualMachines: vi
      .fn()
      .mockResolvedValue({ virtualMachines: [], total: 0 }),
    updateLatestLabelVMs: vi.fn().mockResolvedValue({}),
  }) as unknown as DefaultApiInterface;

let agentApi: DefaultApiInterface;

beforeEach(() => {
  agentApi = createAgentApi();
});

const renderModal = () => {
  const onClose = vi.fn();
  const onLabelsChanged = vi.fn();
  render(
    <ManageLabelsModal
      isOpen
      onClose={onClose}
      onLabelsChanged={onLabelsChanged}
      agentApi={agentApi}
    />,
  );
  return { onClose, onLabelsChanged };
};

const startRenaming = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByLabelText("Edit label prod"));
  const input = screen.getByLabelText("Edit label name");
  await user.clear(input);
  return input;
};

test("shows an error when renaming a label beyond the maximum length", async () => {
  const user = userEvent.setup();
  const { onLabelsChanged } = renderModal();

  const input = await startRenaming(user);
  await user.type(input, "a".repeat(MAX_LABEL_LENGTH + 1));
  await user.click(screen.getByLabelText("Confirm rename"));

  expect(
    screen.getByText(
      `Label exceeds the maximum length of ${MAX_LABEL_LENGTH} characters.`,
    ),
  ).toBeInTheDocument();
  expect(onLabelsChanged).not.toHaveBeenCalled();
});

test("does not persist changes when saving with an invalid rename", async () => {
  const user = userEvent.setup();
  const { onClose } = renderModal();

  const input = await startRenaming(user);
  await user.type(input, "a".repeat(MAX_LABEL_LENGTH + 1));
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(
      screen.getByText(
        `Label exceeds the maximum length of ${MAX_LABEL_LENGTH} characters.`,
      ),
    ).toBeInTheDocument();
  });
  expect(agentApi.deleteLatestLabelGlobally).not.toHaveBeenCalled();
  expect(agentApi.updateLatestLabelVMs).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test("clears the error once the user edits the name again", async () => {
  const user = userEvent.setup();
  renderModal();

  const input = await startRenaming(user);
  await user.type(input, "a".repeat(MAX_LABEL_LENGTH + 1));
  await user.click(screen.getByLabelText("Confirm rename"));

  expect(screen.getByText(/exceeds the maximum length/i)).toBeInTheDocument();

  await user.type(input, "{Backspace}");

  await waitFor(() => {
    expect(
      screen.queryByText(/exceeds the maximum length/i),
    ).not.toBeInTheDocument();
  });
});
