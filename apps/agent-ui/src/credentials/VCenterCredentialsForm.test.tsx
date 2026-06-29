import { Button } from "@patternfly/react-core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { VCenterCredentialsForm } from "./VCenterCredentialsForm";

test("test VCenterCredentialsForm submit with /sdk in URL", async () => {
  const user = userEvent.setup();
  const mockOnSubmit = vi.fn();
  const { getByRole, getByLabelText } = render(
    <>
      <VCenterCredentialsForm
        id="vcenter-credentials-form"
        onSubmit={mockOnSubmit}
      />
      <Button variant="primary" type="submit" form="vcenter-credentials-form">
        Submit
      </Button>
    </>,
  );

  const urlInput = getByLabelText(/vCenter URL/i);
  await user.type(urlInput, "https://vcenter.example.com/sdk");

  const usernameInput = getByLabelText(/Username/i);
  await user.type(usernameInput, "admin@vsphere.local");

  const passwordInput = getByLabelText(/Password/i);
  expect(passwordInput).toHaveAttribute("type", "password");
  await user.type(passwordInput, "SecretPassword123");

  const submitButton = getByRole("button", { name: /Submit/i });
  await user.click(submitButton);

  await waitFor(() => {
    expect(mockOnSubmit.mock.calls.length).toBe(1);
    expect(mockOnSubmit.mock.calls[0][0]).toEqual({
      url: "https://vcenter.example.com/sdk",
      username: "admin@vsphere.local",
      password: "SecretPassword123",
    });
  });
});

test("test VCenterCredentialsForm submit without /sdk in URL", async () => {
  const user = userEvent.setup();
  const mockOnSubmit = vi.fn();
  const { getByRole, getByLabelText } = render(
    <>
      <VCenterCredentialsForm
        id="vcenter-credentials-form"
        onSubmit={mockOnSubmit}
      />
      <Button variant="primary" type="submit" form="vcenter-credentials-form">
        Submit
      </Button>
    </>,
  );

  const urlInput = getByLabelText(/vCenter URL/i);
  await user.type(urlInput, "https://vcenter.example.com/");

  const usernameInput = getByLabelText(/Username/i);
  await user.type(usernameInput, "admin@vsphere.local");

  const passwordInput = getByLabelText(/Password/i);
  expect(passwordInput).toHaveAttribute("type", "password");
  await user.type(passwordInput, "SecretPassword123");

  const submitButton = getByRole("button", { name: /Submit/i });
  await user.click(submitButton);

  await waitFor(() => {
    expect(mockOnSubmit.mock.calls.length).toBe(1);
    expect(mockOnSubmit.mock.calls[0][0]).toEqual({
      url: "https://vcenter.example.com/sdk",
      username: "admin@vsphere.local",
      password: "SecretPassword123",
    });
  });
});

test("test VCenterCredentialsForm shows error when password is missing", async () => {
  const user = userEvent.setup();
  const mockOnSubmit = vi.fn();
  const { getByLabelText } = render(
    <>
      <VCenterCredentialsForm
        id="vcenter-credentials-form"
        onSubmit={mockOnSubmit}
      />
      <Button variant="primary" type="submit" form="vcenter-credentials-form">
        Submit
      </Button>
    </>,
  );

  const urlInput = getByLabelText(/vCenter URL/i);
  await user.type(urlInput, "https://vcenter.example.com");

  const usernameInput = getByLabelText(/Username/i);
  await user.type(usernameInput, "admin@vsphere.local");

  const passwordInput = getByLabelText(/Password/i);
  await user.click(passwordInput);
  await user.tab();

  await waitFor(() => {
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  expect(mockOnSubmit).not.toHaveBeenCalled();
});
