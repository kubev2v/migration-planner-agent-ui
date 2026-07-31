import { ResponseError } from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "../../../../common/agentApi";
import { getLatestCollectionId } from "../../../../common/collectionApi";
import {
  type ExportFormat,
  type ExportScopeId,
  scopesToExportParam,
} from "./exportScopes";

const EXPORT_FETCH_INIT = { cache: "no-store" as RequestCache };

/** Infer ZIP payload format from Content-Type, if recognizable. */
export function detectExportFormatFromContentType(
  contentType: string | null,
): ExportFormat | null {
  if (!contentType) {
    return null;
  }

  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (
    normalized === "application/zip" ||
    normalized === "application/x-zip-compressed" ||
    normalized.endsWith("/zip")
  ) {
    return "zip";
  }

  return null;
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
  _format: ExportFormat = "zip",
): Promise<Blob> {
  const collectionId = await getLatestCollectionId(agentApi);
  if (!collectionId) {
    throw new Error("No collection is available to export.");
  }

  const scope = scopesToExportParam(scopes);

  try {
    const response = await agentApi.exportCollectionRaw(
      {
        id: collectionId,
        scope,
      },
      EXPORT_FETCH_INIT,
    );

    return response.value();
  } catch (error) {
    throw new Error(await getExportErrorMessage(error));
  }
}
