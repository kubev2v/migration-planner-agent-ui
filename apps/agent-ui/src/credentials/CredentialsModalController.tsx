import type React from "react";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * React-lifecycle owner for the vCenter credentials edit modal.
 *
 * The modal is opened from distant components (storage offload, VM actions)
 * that pass the action the user was trying to perform; that action runs once,
 * after a successful connect. The callback is a function, so it cannot live in
 * the Redux store (serializability) — it is held in a ref here instead of a
 * module-level global, and both the open/closed flag and the callback stay
 * inside the React tree.
 */
export interface CredentialsModalControls {
  isCredentialsModalOpen: boolean;
  /** Open the credentials modal, optionally running `onSuccess` after a connect. */
  openCredentialsModal: (onSuccess?: () => void) => void;
  /** Close the modal; when `triggerSuccessCallback`, run the pending action. */
  closeCredentialModal: (triggerSuccessCallback?: boolean) => void;
}

const CredentialsModalContext = createContext<CredentialsModalControls | null>(
  null,
);

export const CredentialsModalProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const pendingSuccessRef = useRef<(() => void) | null>(null);

  const openEditModal = useCallback((onSuccess?: () => void) => {
    pendingSuccessRef.current = onSuccess ?? null;
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback((triggerSuccessCallback?: boolean) => {
    setIsEditModalOpen(false);
    const callback = pendingSuccessRef.current;
    pendingSuccessRef.current = null;
    if (triggerSuccessCallback && callback) {
      callback();
    }
  }, []);

  const value = useMemo<CredentialsModalControls>(
    () => ({
      isCredentialsModalOpen: isEditModalOpen,
      openCredentialsModal: openEditModal,
      closeCredentialModal: closeEditModal,
    }),
    [isEditModalOpen, openEditModal, closeEditModal],
  );

  return (
    <CredentialsModalContext.Provider value={value}>
      {children}
    </CredentialsModalContext.Provider>
  );
};

CredentialsModalProvider.displayName = "CredentialsModalProvider";

export const useCredentialsModal = (): CredentialsModalControls => {
  const context = useContext(CredentialsModalContext);
  if (context === null) {
    throw new Error(
      "useCredentialsModal must be used within a CredentialsModalProvider",
    );
  }
  return context;
};
