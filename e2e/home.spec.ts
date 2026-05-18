import { expect, test } from "@playwright/test";

test("ana sayfa yüklenir", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Özel Vektör")).toBeVisible();
  await expect(
    page.getByText("Sahanın dijital gözü, verinin güvenli yolu."),
  ).toBeVisible();
});
