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

/** Ziyaret klasörü adı: "17.05.2026 Öncel Eczanesi" */
export function buildVisitFolderName(
  businessName: string,
  date: Date = new Date(),
): string {
  const trimmed = businessName.trim();
  return `${formatVisitDate(date)} ${trimmed}`;
}
