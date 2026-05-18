const WELCOME_DISMISSED_KEY = "vl_welcome_dismissed_v1";

export function isWelcomeDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WELCOME_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setWelcomeDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WELCOME_DISMISSED_KEY, "1");
  } catch {
    // localStorage dolu veya devre dışı — sessizce geç
  }
}
