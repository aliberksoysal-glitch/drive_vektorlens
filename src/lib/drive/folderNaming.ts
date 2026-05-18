const ISTANBUL_TZ = "Europe/Istanbul";

const visitDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Bugünün tarihini DD.MM.YYYY formatında döndürür (İstanbul saati). */
export function formatVisitDate(date: Date = new Date()): string {
  return visitDateFormatter.format(date);
}

/** `<input type="date">` için bugün (İstanbul), YYYY-MM-DD. */
export function getTodayDateInputValue(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** YYYY-MM-DD → Date (takvim günü; formatVisitDate ile uyumlu). */
export function parseVisitDateInput(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return probe;
}

/** YYYY-MM-DD girişini DD.MM.YYYY olarak döndürür; geçersizse null. */
export function formatVisitDateFromInput(isoDate: string): string | null {
  const parsed = parseVisitDateInput(isoDate);
  if (!parsed) return null;
  return formatVisitDate(parsed);
}

/** Ziyaret klasörü adı: "17.05.2026 Öncel Eczanesi" */
export function buildVisitFolderName(
  businessName: string,
  date: Date = new Date(),
): string {
  const trimmed = businessName.trim();
  return `${formatVisitDate(date)} ${trimmed}`;
}
