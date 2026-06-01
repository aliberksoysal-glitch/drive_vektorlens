import { expect, test } from "@playwright/test";

test.describe("Target Folder Selection and Folder Navigation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock /api/drive/health
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

    // Mock /api/drive/businesses
    await page.route("**/api/drive/businesses", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          businesses: [
            { id: "biz-1", name: "Aydin Eczanesi" },
            { id: "biz-2", name: "Bursa Tekstil" },
          ],
        }),
      });
    });

    // Mock /api/drive/browse
    await page.route("**/api/drive/browse**", async (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "biz-1") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            folders: [
              { id: "sub-1", name: "2026-05-31" },
              { id: "sub-2", name: "Merdiven" },
            ],
          }),
        });
      } else if (folderId === "sub-1") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            folders: [],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            folders: [],
          }),
        });
      }
    });

    // Mock folder creation POST /api/drive/folders
    await page.route("**/api/drive/folders", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            created: true,
            folder: { id: "new-folder-id", name: "Yeni Pano" },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock dated folder creation POST /api/drive/visit-folder
    await page.route("**/api/drive/visit-folder", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          created: true,
          folder: { id: "new-dated-id", name: "2026-06-01" },
        }),
      });
    });
  });

  test("should browse and select a target folder", async ({ page }) => {
    // Go to homepage
    await page.goto("/");

    // Dismiss welcome modal
    await page.getByRole("button", { name: "Anladım, Başlayalım" }).click();

    // 1. Company selection list should load
    const businessButton = page.getByRole("button", { name: "Aydin Eczanesi", exact: true });
    await expect(businessButton).toBeVisible();
    await businessButton.click();

    // 2. Folder browsing should open (breadcrumbs and folder picker should be visible)
    await expect(page.getByText("Klasör seç")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aydin Eczanesi", exact: true })).toBeVisible();

    // Check existing folders inside the business
    await expect(page.getByText("2026-05-31")).toBeVisible();
    await expect(page.getByText("Merdiven")).toBeVisible();

    // 3. Navigate into a subfolder (click "İçine Git →")
    const enterDatedFolderBtn = page.locator("li").filter({ hasText: "2026-05-31" }).getByRole("button", { name: "İçine Git →" });
    await enterDatedFolderBtn.click();

    // Breadcrumbs should update
    await expect(page.getByRole("button", { name: "2026-05-31", exact: true })).toBeVisible();

    // 4. Media upload button should be visible right below
    await expect(page.getByRole("button", { name: "📸 FOTOĞRAF VEYA VİDEO" })).toBeVisible();

    // Go back to the parent company
    const goUpBtn = page.getByRole("button", { name: "← Üst klasör" });
    await expect(goUpBtn).toBeVisible();
    await goUpBtn.click();

    // Breadcrumbs should go back
    await expect(page.getByRole("button", { name: "2026-05-31", exact: true })).not.toBeVisible();

    // Breadcrumb header should show "İşletmeler" link
    const bizBreadcrumb = page.getByRole("button", { name: "İşletmeler", exact: true });
    await expect(bizBreadcrumb).toBeVisible();

    // Bottom button should be "← İşletmeler"
    const goBackToBusinessesBtn = page.getByRole("button", { name: "← İşletmeler" });
    await expect(goBackToBusinessesBtn).toBeVisible();
    await goBackToBusinessesBtn.click();

    // Should be back to the company list
    await expect(page.getByRole("button", { name: "Aydin Eczanesi", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bursa Tekstil", exact: true })).toBeVisible();
  });
});
