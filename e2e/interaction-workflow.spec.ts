import { test, expect } from "@playwright/test";

test.describe("AI Assistant & CRM Interaction Workflow (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate prior to workflow tests
    await page.goto("/login");
    await page.fill('input[type="email"]', "rep@crm.example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/");
  });

  test("populates interaction fields via AI Assistant and saves record", async ({ page }) => {
    const assistantInput = page.locator('[placeholder*="Type field notes"]');
    await expect(assistantInput).toBeVisible();

    // Type conversation note into AI Assistant
    const note = "Met Dr. Menon, discussed Product X efficacy and tolerability. Positive response, wants Phase III data.";
    await assistantInput.fill(note);
    await page.keyboard.press("Enter");

    // Wait for AI Assistant response in message stream
    await expect(page.locator(".message.assistant").last()).toBeVisible({ timeout: 15000 });

    // Verify form fields automatically updated
    const topicsField = page.locator('textarea[placeholder*="Enter key discussion points"]');
    await expect(topicsField).not.toBeEmpty();

    const positiveRadio = page.locator('input[name="sentiment"][value="Positive"]');
    await expect(positiveRadio).toBeChecked();

    // Save interaction
    const saveButton = page.locator('button:has-text("Log Interaction")');
    await saveButton.click();

    // Verify saved interaction confirmation appears
    await expect(page.locator(".success-text")).toContainText("Saved interaction #", { timeout: 10000 });

    // Verify Audit Trail button is available
    const auditButton = page.locator('button:has-text("View Audit Trail")');
    await expect(auditButton).toBeVisible();

    // Click Audit Trail to open FDA 21 CFR Part 11 Modal
    await auditButton.click();
    await expect(page.locator("text=Regulatory Audit Trail (FDA 21 CFR Part 11)")).toBeVisible();
    await expect(page.locator("text=Alex Vance (REP)")).toBeVisible();
    await expect(page.locator("text=CREATE")).toBeVisible();

    // Close modal
    await page.click('button:has-text("Close Audit Trail")');
    await expect(page.locator("text=Regulatory Audit Trail (FDA 21 CFR Part 11)")).not.toBeVisible();
  });

  test("edits an existing draft via conversational instruction", async ({ page }) => {
    const assistantInput = page.locator('[placeholder*="Type field notes"]');
    await assistantInput.fill("Edit the outcome: HCP requested patient starter guide and financial assistance details.");
    await page.keyboard.press("Enter");

    // Assistant confirms draft update
    await expect(page.locator(".message.assistant").last()).toContainText("updated the interaction draft", { timeout: 15000 });

    const outcomesField = page.locator('textarea[placeholder*="Key outcomes or agreements"]');
    await expect(outcomesField).toHaveValue(/patient starter guide/);
  });
});
