import type {
  MigrationEstimationByComplexityResponseLike,
  MigrationEstimationResponseLike,
} from "@openshift-migration-advisor/shared-components";

export interface MigrationEstimationRequest {
  filterExpression?: string;
  estimationSchema?: string[];
  params?: Record<string, number>;
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

/** POST /migration-estimation (analyzer OpenAPI). */
export async function calculateMigrationEstimation(
  basePath: string,
  body: MigrationEstimationRequest,
): Promise<MigrationEstimationResponseLike> {
  const res = await fetch(`${basePath}/migration-estimation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as MigrationEstimationResponseLike;
}

/** POST /migration-estimation/by-complexity (analyzer OpenAPI). */
export async function calculateMigrationEstimationByComplexity(
  basePath: string,
  body: MigrationEstimationRequest,
): Promise<MigrationEstimationByComplexityResponseLike> {
  const res = await fetch(`${basePath}/migration-estimation/by-complexity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as MigrationEstimationByComplexityResponseLike;
}
