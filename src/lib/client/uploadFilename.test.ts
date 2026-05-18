import { describe, expect, it } from "vitest";
import {
  buildPhotoUploadFileName,
  sanitizeFilenameSegment,
} from "@/lib/client/uploadFilename";

describe("uploadFilename", () => {
  it("sanitizeFilenameSegment güvenli segment üretir", () => {
    expect(sanitizeFilenameSegment('Foo / Bar')).toBe("Foo_Bar");
    expect(sanitizeFilenameSegment("")).toBe("x");
  });

  it("buildPhotoUploadFileName şablon ve uzantıyı uygular", () => {
    const name = buildPhotoUploadFileName("{business}-{visit}-{index}.{ext}", {
      business: "Test İşletme",
      visit: "2026-05-18 · Firma",
      index: 3,
      originalName: "IMG.JPEG",
      now: new Date("2026-05-18T14:30:00"),
    });
    expect(name).toMatch(/^Test_/);
    expect(name.endsWith(".jpeg")).toBe(true);
    expect(name).toContain("-3.");
  });

  it("tarih yer tutucularını doldurur", () => {
    const name = buildPhotoUploadFileName("{date}-{time}-{index}.{ext}", {
      business: "A",
      visit: "B",
      index: 1,
      originalName: "x.png",
      now: new Date("2026-01-05T08:09:10"),
    });
    expect(name).toContain("2026-01-05");
    expect(name).toContain("080910");
    expect(name.endsWith(".png")).toBe(true);
  });
});
