/** Tarayıcı fetch katmanında geçici bağlantı kopması vb. */
export function isTransientNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  if (err instanceof TypeError) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|networkerror|load failed|network request failed/i.test(
    msg,
  );
}
