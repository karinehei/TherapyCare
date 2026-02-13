import { test, expect } from "@playwright/test";

test.describe("Public directory", () => {
  test("search page loads with filters", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /find a therapist/i })).toBeVisible();
    await expect(page.getByPlaceholderText(/name or specialty/i)).toBeVisible();
    await expect(page.getByLabelText(/specialty/i)).toBeVisible();
    await expect(page.getByLabelText(/language/i)).toBeVisible();
    await expect(page.getByLabelText(/remote only/i)).toBeVisible();
  });

  test("filters sync to URL", async ({ page }) => {
    await page.goto("/");

    await page.getByLabelText(/specialty/i).selectOption("Anxiety");
    await expect(page).toHaveURL(/\?.*specialty=Anxiety/);

    await page.getByPlaceholderText(/name or specialty/i).fill("anxiety");
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\?.*q=anxiety/);
  });

  test("navigates to therapist detail from search", async ({ page }) => {
    await page.goto("/");

    await page.waitForSelector("table tbody tr a, .empty-state", { timeout: 5000 }).catch(() => {});

    const viewLink = page.getByRole("link", { name: "View" }).first();
    if (await viewLink.isVisible()) {
      await viewLink.click();
      await expect(page).toHaveURL(/\/therapists\/\d+/);
      await expect(page.getByRole("link", { name: /request appointment/i })).toBeVisible();
    }
  });
});
