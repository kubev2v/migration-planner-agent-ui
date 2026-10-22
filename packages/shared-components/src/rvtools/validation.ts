import { RVTOOLS_ALLOWED_EXTENSIONS } from "./constants.js";

export const getFileExtension = (fileName: string): string =>
  fileName.toLowerCase().split(".").pop() ?? "";

export const isAllowedRvtoolsExtension = (fileName: string): boolean =>
  RVTOOLS_ALLOWED_EXTENSIONS.includes(
    getFileExtension(fileName) as (typeof RVTOOLS_ALLOWED_EXTENSIONS)[number],
  );
