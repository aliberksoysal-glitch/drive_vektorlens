import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mergeMediaFileLists } from "@/lib/client/mergeMediaFiles";
import { isUploadableMediaFile } from "@/lib/mediaTypes";

/** DriveApp.handleFileInputChange ile aynı seçim mantığı */
function selectMediaForUpload(files: File[]): File[] {
  return Array.from(files).filter(isUploadableMediaFile);
}

describe("mediaUploadBatch", () => {
  it("150 dosyayı kesmeden kabul eder", () => {
    const files = Array.from({ length: 150 }, (_, i) =>
      new File([new Uint8Array([0xff, 0xd8, 0xff])], `photo-${i}.jpg`, {
        type: "image/jpeg",
      }),
    );
    expect(selectMediaForUpload(files)).toHaveLength(150);
  });

  it("DriveApp içinde 100 adet üst sınırı tanımlı değil", () => {
    const driveAppPath = path.join(
      process.cwd(),
      "src",
      "components",
      "DriveApp.tsx",
    );
    const src = readFileSync(driveAppPath, "utf8");
    expect(src).not.toContain("MAX_MEDIA_ITEMS");
    expect(src).not.toMatch(/En fazla \$\{MAX_MEDIA/);
    expect(src).not.toMatch(/slice\(0,\s*100\)/);
  });

  it("mergeMediaFileLists partileri birleştirir ve yinelenenleri atlar", () => {
    const batch1 = Array.from({ length: 100 }, (_, i) =>
      new File([new Uint8Array([1])], `p${i}.jpg`, { type: "image/jpeg" }),
    );
    const batch2 = Array.from({ length: 50 }, (_, i) =>
      new File([new Uint8Array([2])], `p${i + 100}.jpg`, {
        type: "image/jpeg",
      }),
    );
    const dup = batch1[0]!;

    const merged = mergeMediaFileLists(batch1, [...batch2, dup]);
    expect(merged).toHaveLength(150);
  });
});
