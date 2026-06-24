import { ResponseError } from "@openshift-migration-advisor/agent-sdk";

export async function parseApiError(
  err: unknown,
  fallbackMessage = "An error occurred",
): Promise<string> {
  if (err instanceof ResponseError) {
    try {
      const text = await err.response.clone().text();
      if (text) {
        const body = JSON.parse(text);
        if (typeof body?.message === "string" && body.message) {
          return body.message;
        }
        if (typeof body?.error === "string" && body.error) {
          return body.error;
        }
      }
    } catch {}
  }

  return err instanceof Error ? err.message : fallbackMessage;
}
