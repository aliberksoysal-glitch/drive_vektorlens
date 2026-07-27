const WELCOME_DISMISSED_KEY = "vl_welcome_dismissed_v1";
const UPDATES_DISMISSED_KEY = "vl_updates_dismissed_v1_2_1";

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

export function isUpdatesDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(UPDATES_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUpdatesDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UPDATES_DISMISSED_KEY, "1");
  } catch {
    // localStorage dolu veya devre dışı — sessizce geç
  }
}
