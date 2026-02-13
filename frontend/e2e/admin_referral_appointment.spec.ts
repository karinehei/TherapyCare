import { test, expect } from "@playwright/test";

test.describe("Admin referral and appointment flow", () => {
  test("admin logs in, changes referral status, sees patient created, books appointment", async ({
    page,
  }) => {
    // 1. Login as admin
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@therapycare.demo");
    await page.getByLabel(/password/i).fill("demo123");
    await page.getByRole("button", { name: /log in|sign in|login/i }).click();
    await expect(page).toHaveURL(/\/app/);

    // 2. Go to referrals
    await page.getByRole("link", { name: "Referrals" }).click();
    await expect(page).toHaveURL(/\/app\/referrals/);

    // 3. Find a referral with status "New" (e.g. Carol Doe) and open it
    const carolRow = page.locator("tr:has-text('Carol')").first();
    const referralLink = carolRow.getByRole("link", { name: "View" });
    await referralLink.click();
    await expect(page).toHaveURL(/\/app\/referrals\/\d+/);

    // 4. Change status to Approved (click the Approved transition button)
    const approveBtn = page.getByRole("button", { name: /→ Approved/i });
    await approveBtn.click();
    await page.waitForTimeout(800);

    // 5. Go to patients and verify Carol Doe appears
    await page.getByRole("link", { name: "Patients" }).click();
    await expect(page).toHaveURL(/\/app\/patients/);

    const patientLink = page.getByRole("link", { name: "Carol Doe" });
    await expect(patientLink).toBeVisible({ timeout: 8000 });
    await patientLink.click();
    await expect(page).toHaveURL(/\/app\/patients\/\d+/);

    // 6. Book an appointment
    await page.getByRole("button", { name: "Book appointment" }).click();

    // Fill form - therapist
    const therapistSelect = page.getByLabel("Therapist");
    await therapistSelect.selectOption({ index: 1 }); // First actual therapist (index 0 is "Select…")

    // Date: use tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    await page.getByLabel("Date").fill(dateStr);

    await page.getByLabel("Start").fill("14:00");
    await page.getByLabel("End").fill("15:00");

    await page.getByRole("button", { name: "Book" }).click();

    // 7. Verify appointment appears
    await expect(page.getByText(/14:00|2:00|15:00|3:00/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/booked|completed/i)).toBeVisible({ timeout: 3000 });
  });
});
