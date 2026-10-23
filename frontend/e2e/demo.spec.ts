import { test, expect, type Page, type Route } from "@playwright/test";

const API_ESCAPE =
  /\/api\/|\/admin\/|localhost:8000|127\.0\.0\.1:8000|auth\/(login|refresh|logout)/i;

async function assertNoBackendTraffic(page: Page) {
  page.on("request", (req) => {
    const url = req.url();
    // Allow same-origin static assets for the Pages demo itself.
    if (API_ESCAPE.test(url) && !url.includes("/TherapyCare/")) {
      throw new Error(`Demo leaked a backend request: ${url}`);
    }
    if (url.includes("/api/") || url.includes("/admin/")) {
      throw new Error(`Demo leaked an API/admin request: ${url}`);
    }
  });
}

async function blockEscapedApis(page: Page) {
  await page.route("**/*", async (route: Route) => {
    const url = route.request().url();
    if (url.includes("/api/") || url.includes("/admin/")) {
      await route.abort("failed");
      throw new Error(`Blocked escaped request: ${url}`);
    }
    await route.continue();
  });
}

async function selectRole(page: Page, label: RegExp) {
  await page.goto("#/login");
  await page.getByRole("button", { name: label }).click();
  await expect(page).toHaveURL(/#\/app/);
}

test.describe("Pages demo (built)", () => {
  test.beforeEach(async ({ page }) => {
    await assertNoBackendTraffic(page);
    await blockEscapedApis(page);
  });

  test("home, nested hash routes, reload, and back/forward", async ({
    page,
  }) => {
    await page.goto("#/");
    await expect(
      page.getByRole("heading", { name: /find a therapist/i })
    ).toBeVisible();
    await expect(page.getByText(/portfolio demo/i)).toBeVisible();

    await page.getByLabel(/specialty/i).selectOption("Anxiety");
    await expect(page.getByRole("link", { name: "View" }).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("link", { name: "View" }).first().click();
    await expect(page).toHaveURL(/#\/therapists\/\d+/);
    await expect(page.getByText(/weekly availability/i)).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/#\/therapists\/\d+/);
    await expect(page.getByText(/open demo slots/i)).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/#\//);
    await page.goForward();
    await expect(page).toHaveURL(/#\/therapists\/\d+/);
  });

  test("help seeker: book and cancel", async ({ page }) => {
    await selectRole(page, /help seeker/i);
    await page.goto("#/");
    await page.getByRole("link", { name: "View" }).first().click();
    await expect(page.getByText(/open demo slots/i)).toBeVisible();

    const bookBtn = page.getByRole("button", { name: /^book$/i }).first();
    await expect(bookBtn).toBeVisible();
    await bookBtn.click();
    await expect(page.getByText(/demo appointment booked/i)).toBeVisible();

    await page.goto("#/app/appointments");
    await expect(page.getByText(/appointment/i).first()).toBeVisible();
    const view = page.locator("a.calendar-slot").first();
    if (await view.count()) {
      await view.click();
      await page.getByRole("button", { name: /cancel appointment/i }).click();
      await expect(page.getByText(/demo appointment cancelled/i)).toBeVisible();
    }
  });

  test("clinic admin: referral workflow and audit", async ({ page }) => {
    await selectRole(page, /clinic admin/i);

    await page.goto("#/app/referrals/new");
    await page.getByLabel(/^name/i).fill("Riley Fiction");
    await page.getByLabel(/^email/i).fill("riley.fiction@example.invalid");
    await page.getByLabel(/reason/i).fill("Portfolio demo referral only.");
    await page.getByRole("button", { name: /submit referral/i }).click();
    await expect(page).toHaveURL(/#\/app\/referrals\/\d+/);

    await page.getByRole("button", { name: /approved/i }).click();
    await expect(page.getByText(/^approved$/i).first()).toBeVisible({
      timeout: 5_000,
    });

    await page.goto("#/app/patients");
    await expect(
      page.getByRole("link", { name: /riley fiction/i })
    ).toBeVisible();

    await page.goto("#/app/audit");
    await expect(
      page.getByRole("heading", { name: /audit log/i })
    ).toBeVisible();
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  test("reset demo restores fixtures", async ({ page }) => {
    await selectRole(page, /clinic admin/i);
    await page.getByRole("button", { name: /reset demo/i }).click();
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByText(/choose a demo role/i)).toBeVisible();
  });

  test("mobile layout ~375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("#/");
    await expect(
      page.getByRole("heading", { name: /find a therapist/i })
    ).toBeVisible();
    await expect(page.getByText(/portfolio demo/i)).toBeVisible();
    const banner = page.locator(".demo-banner");
    await expect(banner).toBeVisible();
  });
});
