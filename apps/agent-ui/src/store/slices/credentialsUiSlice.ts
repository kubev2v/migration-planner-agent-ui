import { createSlice } from "@reduxjs/toolkit";

/**
 * Client-only UI state for the vCenter credentials edit modal. Server data
 * (credential status, capabilities) lives in RTK Query; only the modal's
 * open/closed flag is client state, so it belongs in a slice rather than the
 * credentials cache.
 *
 * The "run this action after a successful connect" callback is intentionally
 * NOT stored here — functions are non-serializable. It lives in a module ref
 * next to the `useCredentialsModal` hook.
 */
export interface CredentialsUiState {
  isEditModalOpen: boolean;
}

const initialState: CredentialsUiState = { isEditModalOpen: false };

const credentialsUiSlice = createSlice({
  name: "credentialsUi",
  initialState,
  reducers: {
    openEditModal: (state) => {
      state.isEditModalOpen = true;
    },
    closeEditModal: (state) => {
      state.isEditModalOpen = false;
    },
  },
});

export const { openEditModal, closeEditModal } = credentialsUiSlice.actions;
export const credentialsUiReducer = credentialsUiSlice.reducer;
