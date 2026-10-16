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

  if (err instanceof Error && err.message) {
    return err.message;
  }

  // RTK Query rejects `.unwrap()` with the baseQuery-mapped `{ status, message }`
  // object (not an Error), so read the message off that shape too.
  if (err && typeof err === "object" && "message" in err) {
    const { message } = err as { message?: unknown };
    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallbackMessage;
}
