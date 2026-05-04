import { test, expect } from "@playwright/test";

test.describe("smoke — public auth shell", () => {
  test("landing page renders hero and primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Ship Changes Without Writing Code/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Building Free/i })).toBeVisible();
    await expect(page.getByText(/VibeCode/i).first()).toBeVisible();
  });

  test("login page shows email form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-slot="card-title"]').getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Log in/i })).toBeVisible();
  });

  test("signup page shows registration form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('[data-slot="card-title"]').getByText("Create your account")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password").first()).toBeVisible();
    await expect(page.getByLabel(/Confirm password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Create account/i })).toBeVisible();
  });

  test("dashboard redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
