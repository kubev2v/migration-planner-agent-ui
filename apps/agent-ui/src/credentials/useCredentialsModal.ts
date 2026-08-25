import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  closeEditModal as closeEditModalAction,
  openEditModal as openEditModalAction,
} from "../store/slices/credentialsUiSlice";

/**
 * Holds the "run after a successful connect" callback outside Redux, because it
 * is a function and would violate store serializability. The edit modal is
 * opened from distant components (storage offload, VM actions) that pass the
 * action the user was trying to perform; it runs once, when the modal closes
 * after a successful update.
 */
let pendingSuccessCallback: (() => void) | null = null;

function setPendingSuccess(callback: (() => void) | null): void {
  pendingSuccessCallback = callback;
}

function takePendingSuccess(): (() => void) | null {
  const callback = pendingSuccessCallback;
  pendingSuccessCallback = null;
  return callback;
}

export interface CredentialsModalControls {
  isEditModalOpen: boolean;
  /** Open the edit modal, optionally running `onSuccess` after a connect. */
  openEditModal: (onSuccess?: () => void) => void;
  /** Close the modal; when `triggerSuccessCallback`, run the pending action. */
  closeEditModal: (triggerSuccessCallback?: boolean) => void;
}

export const useCredentialsModal = (): CredentialsModalControls => {
  const dispatch = useAppDispatch();
  const isEditModalOpen = useAppSelector(
    (state) => state.credentialsUi.isEditModalOpen,
  );

  const openEditModal = useCallback(
    (onSuccess?: () => void) => {
      setPendingSuccess(onSuccess ?? null);
      dispatch(openEditModalAction());
    },
    [dispatch],
  );

  const closeEditModal = useCallback(
    (triggerSuccessCallback?: boolean) => {
      dispatch(closeEditModalAction());
      const callback = takePendingSuccess();
      if (triggerSuccessCallback && callback) {
        callback();
      }
    },
    [dispatch],
  );

  return { isEditModalOpen, openEditModal, closeEditModal };
};
