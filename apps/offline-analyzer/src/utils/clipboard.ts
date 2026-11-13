export function canCopyToClipboard(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function" &&
    (typeof window === "undefined" || window.isSecureContext)
  );
}

export function copyToClipboard(text: string): Promise<void> {
  if (!canCopyToClipboard()) {
    return Promise.reject(
      new Error(
        "Clipboard is not available. Use HTTPS or localhost to enable copy.",
      ),
    );
  }
  return navigator.clipboard.writeText(text);
}
