import { describe, expect, test } from "vitest";
import {
  type CollectionLifecycleState,
  closeModal,
  collectingStarted,
  collectionErrored,
  collectionLifecycleReducer,
  collectionSucceeded,
  collectorStatusChanged,
  dismissCollectError,
  dismissReadyAlert,
  openModal,
} from "./collectionLifecycleSlice";

const initialState: CollectionLifecycleState = {
  isModalOpen: false,
  isCollecting: false,
  collectorStatus: null,
  showReadyAlert: false,
  collectError: null,
};

describe("collectionLifecycleSlice", () => {
  test("openModal opens the modal and clears any previous error", () => {
    const state = collectionLifecycleReducer(
      { ...initialState, collectError: "boom" },
      openModal(),
    );
    expect(state.isModalOpen).toBe(true);
    expect(state.collectError).toBeNull();
  });

  test("openModal is a no-op while a run is in progress", () => {
    const collecting: CollectionLifecycleState = {
      ...initialState,
      isCollecting: true,
    };
    expect(collectionLifecycleReducer(collecting, openModal())).toEqual(
      collecting,
    );
  });

  test("closeModal closes the modal", () => {
    const state = collectionLifecycleReducer(
      { ...initialState, isModalOpen: true },
      closeModal(),
    );
    expect(state.isModalOpen).toBe(false);
  });

  test("collectingStarted marks the run in progress and closes the modal", () => {
    const state = collectionLifecycleReducer(
      { ...initialState, isModalOpen: true, showReadyAlert: true },
      collectingStarted("collecting"),
    );
    expect(state).toEqual<CollectionLifecycleState>({
      isModalOpen: false,
      isCollecting: true,
      collectorStatus: "collecting",
      showReadyAlert: false,
      collectError: null,
    });
  });

  test("collectorStatusChanged updates only the observed status", () => {
    const state = collectionLifecycleReducer(
      { ...initialState, isCollecting: true, collectorStatus: "connecting" },
      collectorStatusChanged("parsing"),
    );
    expect(state.collectorStatus).toBe("parsing");
    expect(state.isCollecting).toBe(true);
  });

  test("collectionSucceeded ends the run and shows the ready alert", () => {
    const state = collectionLifecycleReducer(
      { ...initialState, isCollecting: true, collectorStatus: "collected" },
      collectionSucceeded(),
    );
    expect(state).toEqual<CollectionLifecycleState>({
      isModalOpen: false,
      isCollecting: false,
      collectorStatus: null,
      showReadyAlert: true,
      collectError: null,
    });
  });

  test("collectionErrored ends the run and records the message", () => {
    const state = collectionLifecycleReducer(
      { ...initialState, isCollecting: true, collectorStatus: "collecting" },
      collectionErrored("lost contact"),
    );
    expect(state).toEqual<CollectionLifecycleState>({
      isModalOpen: false,
      isCollecting: false,
      collectorStatus: null,
      showReadyAlert: false,
      collectError: "lost contact",
    });
  });

  test("dismissReadyAlert hides the success alert", () => {
    const state = collectionLifecycleReducer(
      { ...initialState, showReadyAlert: true },
      dismissReadyAlert(),
    );
    expect(state.showReadyAlert).toBe(false);
  });

  test("dismissCollectError clears the error", () => {
    const state = collectionLifecycleReducer(
      { ...initialState, collectError: "boom" },
      dismissCollectError(),
    );
    expect(state.collectError).toBeNull();
  });
});
