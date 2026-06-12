export interface VcenterCredentials {
  url: string;
  username: string;
  password: string;
  cacert?: string;
  skipTls?: boolean;
}

export interface CredentialStatus {
  url: string;
  username: string;
  valid: boolean;
}

export interface PermissionCheckResult {
  granted: boolean;
  missingPrivileges: string[];
}

export type CredentialFeature = "inspector" | "forecaster";

const USERNAME_STORAGE_KEY = "agent-credentials-username";

export function persistUsername(username: string): void {
  try {
    sessionStorage.setItem(USERNAME_STORAGE_KEY, username);
  } catch {
    // ignore
  }
}

export function loadPersistedUsername(): string {
  try {
    return sessionStorage.getItem(USERNAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearPersistedUsername(): void {
  try {
    sessionStorage.removeItem(USERNAME_STORAGE_KEY);
  } catch {
    // ignore
  }
}
