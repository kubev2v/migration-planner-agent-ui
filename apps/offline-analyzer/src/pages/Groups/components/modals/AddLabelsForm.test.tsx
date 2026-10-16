import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AddLabelsForm, MAX_LABEL_LENGTH } from "./AddLabelsForm";

test("adds a valid new label to the selection", async () => {
  const user = userEvent.setup();
  const onSelectedChange = vi.fn();
  render(
    <AddLabelsForm
      existingLabels={[]}
      selected={[]}
      onSelectedChange={onSelectedChange}
    />,
  );

  const input = screen.getByRole("combobox");
  await user.type(input, "team-a");
  await user.keyboard("{Enter}");

  await waitFor(() => {
    expect(onSelectedChange).toHaveBeenCalledWith(["team-a"]);
  });
  expect(
    screen.queryByText(/exceeds the maximum length/i),
  ).not.toBeInTheDocument();
});

test("accepts a label at exactly the maximum length", async () => {
  const user = userEvent.setup();
  const onSelectedChange = vi.fn();
  const maxLabel = "a".repeat(MAX_LABEL_LENGTH);
  render(
    <AddLabelsForm
      existingLabels={[]}
      selected={[]}
      onSelectedChange={onSelectedChange}
    />,
  );

  const input = screen.getByRole("combobox");
  await user.type(input, maxLabel);
  await user.keyboard("{Enter}");

  await waitFor(() => {
    expect(onSelectedChange).toHaveBeenCalledWith([maxLabel]);
  });
});

test("shows an error and does not add a label that exceeds the maximum length", async () => {
  const user = userEvent.setup();
  const onSelectedChange = vi.fn();
  const tooLongLabel = "a".repeat(MAX_LABEL_LENGTH + 1);
  render(
    <AddLabelsForm
      existingLabels={[]}
      selected={[]}
      onSelectedChange={onSelectedChange}
    />,
  );

  const input = screen.getByRole("combobox");
  await user.type(input, tooLongLabel);
  await user.keyboard("{Enter}");

  await waitFor(() => {
    expect(
      screen.getByText(
        `Label exceeds the maximum length of ${MAX_LABEL_LENGTH} characters.`,
      ),
    ).toBeInTheDocument();
  });
  expect(onSelectedChange).not.toHaveBeenCalled();
});

test("clears the error message once the user edits the input", async () => {
  const user = userEvent.setup();
  const onSelectedChange = vi.fn();
  const tooLongLabel = "a".repeat(MAX_LABEL_LENGTH + 1);
  render(
    <AddLabelsForm
      existingLabels={[]}
      selected={[]}
      onSelectedChange={onSelectedChange}
    />,
  );

  const input = screen.getByRole("combobox");
  await user.type(input, tooLongLabel);
  await user.keyboard("{Enter}");

  await waitFor(() => {
    expect(screen.getByText(/exceeds the maximum length/i)).toBeInTheDocument();
  });

  await user.type(input, "{Backspace}");

  await waitFor(() => {
    expect(
      screen.queryByText(/exceeds the maximum length/i),
    ).not.toBeInTheDocument();
  });
});

test("toggles an existing label when selected", async () => {
  const user = userEvent.setup();
  const onSelectedChange = vi.fn();
  render(
    <AddLabelsForm
      existingLabels={["prod"]}
      selected={[]}
      onSelectedChange={onSelectedChange}
    />,
  );

  const input = screen.getByRole("combobox");
  await user.click(input);

  const option = await screen.findByRole("option", { name: "prod" });
  await user.click(option);

  expect(onSelectedChange).toHaveBeenCalledWith(["prod"]);
});
