import type { MigrationComplexityResponseLike } from "@openshift-migration-advisor/shared-components";

export interface MigrationComplexityRequest {
  filterExpression?: string;
}

async function readErrorMessage(res: Response): Promise<string> {
  let msg = `HTTP ${res.status}`;
  try {
    const text = await res.text();
    if (text) {
      const body = JSON.parse(text) as { error?: string };
      if (body?.error) {
        msg = body.error;
      }
    }
  } catch {
    // ignore parse errors
  }
  return msg;
}

/** POST /complexity-estimation (analyzer OpenAPI). */
export async function calculateMigrationComplexity(
  basePath: string,
  filterExpression?: string,
): Promise<MigrationComplexityResponseLike> {
  const body: MigrationComplexityRequest = {};
  if (filterExpression?.trim()) {
    body.filterExpression = filterExpression;
  }

  const res = await fetch(`${basePath}/complexity-estimation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as MigrationComplexityResponseLike;
}
