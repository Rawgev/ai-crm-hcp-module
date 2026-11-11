import { test, expect } from "@playwright/test";

test.describe("Authentication & Session Guards (E2E)", () => {
  test("redirects unauthenticated visitor from root to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("h1")).toContainText("Authorized Sign In");
  });

  test("displays validation error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "invalidpassword");
    await page.click('button[type="submit"]');

    const errorMessage = page.locator(".error-banner");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText("Invalid email or password");
  });

  test("completes full login flow and navigates to CRM dashboard", async ({ page }) => {
    await page.goto("/login");

    // Login with default seed rep account
    await page.fill('input[type="email"]', "rep@crm.example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL("/");
    await expect(page.locator(".badge")).toContainText("REP");
    await expect(page.locator(".user-name")).toContainText("Alex Vance");

    // CRM screen elements should be visible
    await expect(page.locator("text=HCP Interaction Hub")).toBeVisible();
    await expect(page.locator("text=Field Assistant")).toBeVisible();
  });

  test("signs out securely and clears session cookie", async ({ page }) => {
    // Authenticate first
    await page.goto("/login");
    await page.fill('input[type="email"]', "rep@crm.example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/");

    // Click Sign Out
    await page.click('button:has-text("Sign Out")');

    // Should be redirected back to /login
    await expect(page).toHaveURL(/\/login/);
  });
});
