import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRvtoolsFileStaging } from "../useRvtoolsFileStaging.js";

const makeFile = (name: string): File =>
  new File(["content"], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

const requireStagedFileId = (id: string | undefined): string => {
  if (id === undefined) {
    throw new Error("expected staged file id");
  }
  return id;
};

describe("useRvtoolsFileStaging", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks submitable files after staging completes", () => {
    const { result } = renderHook(() =>
      useRvtoolsFileStaging({
        mode: "create",
        isActive: true,
        isDisabled: false,
      }),
    );

    act(() => {
      result.current.addFiles([makeFile("good.xlsx")]);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.getFilesForSubmit()).toHaveLength(1);
    expect(result.current.showReviewTable).toBe(false);
  });

  it("clears job error when the last invalid staged file is removed", () => {
    const onClearError = vi.fn();
    const bad = makeFile("bad.xlsx");
    const good = makeFile("good.xlsx");
    const { result } = renderHook(() =>
      useRvtoolsFileStaging({
        mode: "create",
        isActive: true,
        isDisabled: false,
        onClearError,
      }),
    );

    act(() => {
      result.current.addFiles([bad, good]);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    act(() => {
      result.current.applyValidationResults([
        {
          fileName: bad.name,
          fileSize: bad.size,
          status: "invalid",
          errorMessage: "not a valid zip file",
        },
        {
          fileName: good.name,
          fileSize: good.size,
          status: "valid",
        },
      ]);
    });

    const badId = result.current.stagedFiles.find(
      (entry) => entry.file.name === "bad.xlsx",
    )?.id;
    expect(badId).toBeDefined();

    onClearError.mockClear();

    act(() => {
      result.current.removeFile(requireStagedFileId(badId));
    });

    expect(onClearError).toHaveBeenCalledOnce();
    expect(result.current.invalidFileCount).toBe(0);
    expect(result.current.showReviewTable).toBe(false);
    expect(result.current.getFilesForSubmit()).toHaveLength(1);
    expect(result.current.stagedFiles[0]?.status).toBe("staged");
  });

  it("resolves partial assessment when the last invalid file is removed", () => {
    const onPartialAssessmentResolved = vi.fn();
    const bad = makeFile("bad.xlsx");
    const good = makeFile("good.xlsx");
    const { result } = renderHook(() =>
      useRvtoolsFileStaging({
        mode: "create",
        isActive: true,
        isDisabled: false,
        resumePartialAssessmentId: "assessment-partial",
        onPartialAssessmentResolved,
      }),
    );

    act(() => {
      result.current.addFiles([good, bad]);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      result.current.applyValidationResults([
        {
          fileName: good.name,
          fileSize: good.size,
          status: "valid",
        },
        {
          fileName: bad.name,
          fileSize: bad.size,
          status: "invalid",
          errorMessage: "not a valid zip file",
        },
      ]);
    });

    const badId = result.current.stagedFiles.find(
      (entry) => entry.file.name === "bad.xlsx",
    )?.id;

    act(() => {
      result.current.removeFile(requireStagedFileId(badId));
    });

    expect(onPartialAssessmentResolved).toHaveBeenCalledOnce();
    expect(result.current.stagedFiles).toHaveLength(0);
  });

  it("does not resolve partial assessment when replacing the last invalid file", () => {
    const onPartialAssessmentResolved = vi.fn();
    const bad = makeFile("bad.xlsx");
    const good = makeFile("good.xlsx");
    const replacement = makeFile("fixed.xlsx");
    const { result } = renderHook(() =>
      useRvtoolsFileStaging({
        mode: "create",
        isActive: true,
        isDisabled: false,
        resumePartialAssessmentId: "assessment-partial",
        onPartialAssessmentResolved,
      }),
    );

    act(() => {
      result.current.addFiles([good, bad]);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      result.current.applyValidationResults([
        {
          fileName: good.name,
          fileSize: good.size,
          status: "valid",
        },
        {
          fileName: bad.name,
          fileSize: bad.size,
          status: "invalid",
        },
      ]);
    });

    const badId = result.current.stagedFiles.find(
      (entry) => entry.file.name === "bad.xlsx",
    )?.id;

    act(() => {
      result.current.replaceFile(requireStagedFileId(badId), replacement);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onPartialAssessmentResolved).not.toHaveBeenCalled();
    expect(result.current.getFilesForSubmit()).toHaveLength(1);
    expect(result.current.getFilesForSubmit()[0].name).toBe("fixed.xlsx");
  });
});
