import type {
  CredentialFeature,
  CredentialStatus,
  PermissionCheckResult,
  VcenterCredentials,
} from "./credentialsTypes";

export class CredentialsForbiddenError extends Error {
  constructor(
    message: string,
    public readonly missingPrivileges: string[],
  ) {
    super(message);
    this.name = "CredentialsForbiddenError";
  }
}

/** Returned when the agent was started without --data-folder. */
export const CREDENTIALS_UNAVAILABLE_MESSAGE =
  "credential management not available (data-folder not configured)";

function isCredentialsUnavailable(
  status: number,
  body: { error?: string },
): boolean {
  return (
    status === 500 &&
    body.error?.includes("data-folder not configured") === true
  );
}

async function parseErrorBody(
  res: Response,
): Promise<{ error?: string; missingPrivileges?: string[] }> {
  try {
    return (await res.json()) as {
      error?: string;
      missingPrivileges?: string[];
    };
  } catch {
    return {};
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function normalizeCredentialsUrl(url: string): string {
  let processed = url.trim().replace(/\/$/, "");
  if (!processed.endsWith("/sdk")) {
    processed = `${processed}/sdk`;
  }
  return processed;
}

export async function getCredentials(
  basePath: string,
): Promise<CredentialStatus | null> {
  const res = await fetch(`${basePath}/credentials`);
  if (res.status === 404) return null;
  if (res.status === 500) {
    const body = await parseErrorBody(res);
    if (isCredentialsUnavailable(res.status, body)) return null;
  }
  return handleResponse<CredentialStatus>(res);
}

export async function putCredentials(
  basePath: string,
  credentials: VcenterCredentials,
): Promise<CredentialStatus> {
  const body: Record<string, unknown> = {
    url: normalizeCredentialsUrl(credentials.url),
    username: credentials.username.trim(),
  };
  if (credentials.password) {
    body.password = credentials.password;
  }
  if (credentials.cacert) body.cacert = credentials.cacert;
  if (credentials.skipTls !== undefined) body.skipTls = credentials.skipTls;

  const res = await fetch(`${basePath}/credentials`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await parseErrorBody(res);
    if (isCredentialsUnavailable(res.status, errBody)) {
      throw new Error(CREDENTIALS_UNAVAILABLE_MESSAGE);
    }
    throw new Error(errBody.error ?? `HTTP ${res.status}`);
  }
  const status = (await res.json()) as CredentialStatus;
  return {
    ...status,
    username: status.username || credentials.username.trim(),
  };
}

export async function deleteCredentials(basePath: string): Promise<void> {
  const res = await fetch(`${basePath}/credentials`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return;
  const errBody = await parseErrorBody(res);
  if (isCredentialsUnavailable(res.status, errBody)) return;
  throw new Error(errBody.error ?? `HTTP ${res.status}`);
}

export async function refreshCredentials(
  basePath: string,
): Promise<CredentialStatus> {
  const res = await fetch(`${basePath}/credentials/refresh`, {
    method: "POST",
  });
  if (res.status === 500) {
    const body = await parseErrorBody(res);
    if (isCredentialsUnavailable(res.status, body)) {
      throw new Error(CREDENTIALS_UNAVAILABLE_MESSAGE);
    }
  }
  return handleResponse<CredentialStatus>(res);
}

/**
 * Check whether stored credentials have the privileges required for a feature.
 * Uses POST /credentials/permissions/{feature} when available, otherwise falls
 * back to PUT /forecaster/credentials for the forecaster feature.
 */
export async function checkFeaturePermissions(
  basePath: string,
  feature: CredentialFeature,
  inlineCredentials?: VcenterCredentials,
): Promise<PermissionCheckResult> {
  const permissionsPath = `${basePath}/credentials/permissions/${feature}`;
  const res = await fetch(permissionsPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: inlineCredentials ? JSON.stringify(inlineCredentials) : undefined,
  });

  if (res.status === 404) {
    if (feature === "forecaster" && inlineCredentials) {
      return checkForecasterPermissionsLegacy(basePath, inlineCredentials);
    }
    return { granted: true, missingPrivileges: [] };
  }

  if (res.status === 500) {
    const body = await parseErrorBody(res);
    if (isCredentialsUnavailable(res.status, body)) {
      if (feature === "forecaster" && inlineCredentials) {
        return checkForecasterPermissionsLegacy(basePath, inlineCredentials);
      }
      return { granted: true, missingPrivileges: [] };
    }
  }

  if (res.status === 403) {
    const body = await parseErrorBody(res);
    return {
      granted: false,
      missingPrivileges: body.missingPrivileges ?? [],
    };
  }

  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  const body = (await res.json()) as PermissionCheckResult;
  return {
    granted: body.granted ?? true,
    missingPrivileges: body.missingPrivileges ?? [],
  };
}

async function checkForecasterPermissionsLegacy(
  basePath: string,
  credentials: VcenterCredentials,
): Promise<PermissionCheckResult> {
  const res = await fetch(`${basePath}/forecaster/credentials`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: normalizeCredentialsUrl(credentials.url),
      username: credentials.username.trim(),
      password: credentials.password,
    }),
  });

  if (res.status === 403) {
    const body = await parseErrorBody(res);
    return {
      granted: false,
      missingPrivileges: body.missingPrivileges ?? [],
    };
  }

  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return { granted: true, missingPrivileges: [] };
}
