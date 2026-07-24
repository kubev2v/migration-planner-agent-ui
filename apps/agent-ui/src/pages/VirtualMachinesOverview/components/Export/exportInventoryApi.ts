import {
  type DefaultApiInterface,
  ResponseError,
} from "@openshift-migration-advisor/agent-sdk";
import {
  type ExportFormat,
  type ExportScopeId,
  scopesToExportParam,
} from "./exportScopes";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Infer the payload format from Content-Type, if recognizable. */
export function detectExportFormatFromContentType(
  contentType: string | null,
): ExportFormat | null {
  if (!contentType) {
    return null;
  }

  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (
    normalized === XLSX_CONTENT_TYPE ||
    normalized.includes("spreadsheetml")
  ) {
    return "xlsx";
  }
  if (
    normalized === "application/zip" ||
    normalized === "application/x-zip-compressed" ||
    normalized.endsWith("/zip")
  ) {
    return "zip";
  }

  return null;
}

function assertExportContentTypeMatchesFormat(
  contentType: string | null,
  requestedFormat: ExportFormat,
): void {
  const detectedFormat = detectExportFormatFromContentType(contentType);
  if (detectedFormat === null || detectedFormat === requestedFormat) {
    return;
  }

  if (requestedFormat === "xlsx") {
    throw new Error(
      "Excel export is not supported by this agent. Choose ZIP (CSV files), or upgrade the agent.",
    );
  }

  throw new Error(
    "The agent returned an unexpected export format. Please try again.",
  );
}

async function getExportErrorMessage(error: unknown): Promise<string> {
  if (!(error instanceof ResponseError)) {
    return error instanceof Error
      ? error.message
      : "Failed to export inventory. Please try again.";
  }

  let message = `Export failed (${error.response.status})`;
  try {
    const body: unknown = await error.response.json();
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      message = body.error;
    }
  } catch {
    // Response body is not JSON.
  }
  return message;
}

export async function fetchExportInventory(
  agentApi: DefaultApiInterface,
  scopes: ExportScopeId[],
  format: ExportFormat = "zip",
): Promise<Blob> {
  const scope = scopesToExportParam(scopes);

  try {
    const response = await agentApi.exportInventoryRaw({
      scope,
      format,
    });

    assertExportContentTypeMatchesFormat(
      response.raw.headers.get("content-type"),
      format,
    );

    return response.value();
  } catch (error) {
    throw new Error(await getExportErrorMessage(error));
  }
}
