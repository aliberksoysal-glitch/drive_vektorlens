import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/** Geçerli minimal JPEG (~631 bayt) — gerçek fotoğraf gerekmez */
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
  "base64",
);

const BULK_COUNT = 101;
const FIXTURE_DIR = path.join(__dirname, "fixtures", "bulk-images");

function ensureBulkFixtures(): string[] {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  const paths: string[] = [];
  for (let i = 1; i <= BULK_COUNT; i++) {
    const filePath = path.join(FIXTURE_DIR, `bulk-${String(i).padStart(3, "0")}.jpg`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, TINY_JPEG);
    }
    paths.push(filePath);
  }
  return paths;
}

async function dismissOnboarding(page: import("@playwright/test").Page) {
  await expect(page.getByText("Özel Vektör")).toBeVisible({ timeout: 60_000 });

  const welcome = page.getByRole("button", { name: "Anladım, Başlayalım" });
  await welcome.waitFor({ state: "visible", timeout: 30_000 });
  await welcome.click();

  const updates = page.getByRole("button", { name: "Harika, Devam Et" });
  try {
    await updates.waitFor({ state: "visible", timeout: 8_000 });
    await updates.click();
  } catch {
    // Updates modal gösterilmemiş olabilir
  }
}

async function selectUploadTarget(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Aydin Eczanesi", exact: true }).click();
  await page
    .locator("li")
    .filter({ hasText: "2026-05-31" })
    .getByRole("button", { name: "İçine Git →" })
    .click();
  await expect(page.getByLabel("Fotoğraf veya video seç")).toBeEnabled();
}

test.describe("100+ fotoğraf yükleme", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/drive/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          rootFolder: { id: "root-folder-id", name: "İşletmeler" },
          accountEmail: "test@domain.com",
        }),
      });
    });

    await page.route("**/api/drive/businesses", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          businesses: [{ id: "biz-1", name: "Aydin Eczanesi" }],
        }),
      });
    });

    await page.route("**/api/drive/browse**", async (route) => {
      const folderId = new URL(route.request().url()).searchParams.get("folderId");
      const folders =
        folderId === "biz-1"
          ? [{ id: "sub-1", name: "2026-05-31" }]
          : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, folders, files: [] }),
      });
    });
  });

  test(`${BULK_COUNT} fotoğrafın tamamı yüklenir (100 sınırı yok)`, async ({ page }) => {
    test.setTimeout(600_000);

    let uploadCount = 0;
    await page.route("**/api/drive/upload", async (route) => {
      uploadCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          success: true,
          fileId: `mock-file-${uploadCount}`,
        }),
      });
    });

    const filePaths = ensureBulkFixtures();

    await page.goto("/");
    await dismissOnboarding(page);
    await selectUploadTarget(page);

    await page.getByLabel("Fotoğraf veya video seç").setInputFiles(filePaths);

    await expect.poll(() => uploadCount, { timeout: 480_000 }).toBe(BULK_COUNT);

    await expect(page.getByText("Başarıyla Yüklendi")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(`${BULK_COUNT} fotoğraf Google Drive`)).toBeVisible();
    await expect(page.getByText(/En fazla 100 dosya/i)).toHaveCount(0);
  });
});
