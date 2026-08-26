import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  CredentialsModalProvider,
  useCredentialsModal,
} from "./CredentialsModalController";

/** Render the hook inside the provider that owns the modal state. */
function renderModalHook() {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(CredentialsModalProvider, { children });
  return renderHook(() => useCredentialsModal(), { wrapper });
}

describe("CredentialsModalController", () => {
  it("opens the modal and closed by default", () => {
    const { result } = renderModalHook();

    expect(result.current.isEditModalOpen).toBe(false);

    act(() => {
      result.current.openEditModal();
    });

    expect(result.current.isEditModalOpen).toBe(true);
  });

  it("runs the success callback exactly once when closed with the trigger", () => {
    const onSuccess = vi.fn();
    const { result } = renderModalHook();

    act(() => {
      result.current.openEditModal(onSuccess);
    });
    act(() => {
      result.current.closeEditModal(true);
    });

    expect(result.current.isEditModalOpen).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);

    // Closing again must not re-run the (now cleared) callback.
    act(() => {
      result.current.closeEditModal(true);
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("does not run the success callback when closed without the trigger", () => {
    const onSuccess = vi.fn();
    const { result } = renderModalHook();

    act(() => {
      result.current.openEditModal(onSuccess);
    });
    act(() => {
      result.current.closeEditModal(false);
    });

    expect(result.current.isEditModalOpen).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not carry a callback from a previous open into the next one", () => {
    const firstCallback = vi.fn();
    const { result } = renderModalHook();

    act(() => {
      result.current.openEditModal(firstCallback);
    });
    // Reopen without a callback before the first ever fires.
    act(() => {
      result.current.openEditModal();
    });
    act(() => {
      result.current.closeEditModal(true);
    });

    expect(firstCallback).not.toHaveBeenCalled();
  });

  it("throws when used outside the provider", () => {
    // Silence the expected React error boundary logging.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useCredentialsModal())).toThrow(
      /CredentialsModalProvider/,
    );

    consoleError.mockRestore();
  });
});
