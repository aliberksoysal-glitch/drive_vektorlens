import { describe, expect, it } from "vitest";
import {
  buildVisitFolderName,
  formatVisitDate,
  formatVisitDateFromInput,
  parseVisitDateInput,
} from "@/lib/drive/folderNaming";

describe("folderNaming", () => {
  it("buildVisitFolderName appends trimmed business name", () => {
    const d = new Date(Date.UTC(2026, 4, 18, 9, 0, 0));
    const name = buildVisitFolderName("  Test İşletme  ", d);
    expect(name.endsWith("Test İşletme")).toBe(true);
    expect(name).toMatch(/^\d{2}\.\d{2}\.\d{4} /);
  });

  it("formatVisitDate uses Istanbul calendar day", () => {
    const d = new Date(Date.UTC(2026, 4, 18, 21, 0, 0));
    const formatted = formatVisitDate(d);
    expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it("parseVisitDateInput and formatVisitDateFromInput round-trip", () => {
    const parsed = parseVisitDateInput("2026-05-15");
    expect(parsed).not.toBeNull();
    expect(formatVisitDateFromInput("2026-05-15")).toMatch(
      /^15\.05\.2026$/,
    );
  });
});
