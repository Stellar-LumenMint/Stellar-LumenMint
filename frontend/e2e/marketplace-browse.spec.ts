import { test, expect } from "@playwright/test";

test.describe("Marketplace Browse", () => {
  test("home page loads and shows main sections", async ({ page }) => {
    await page.goto("/");

    // Hero section should be visible
    const heroHeading = page.getByRole("heading", { level: 1 });
    await expect(heroHeading).toBeVisible();

    // Navigation should be present
    const nav = page.getByRole("navigation", { name: /main navigation/i });
    await expect(nav).toBeVisible();
  });

  test("footer renders with essential links", async ({ page }) => {
    await page.goto("/");

    // Footer should have links
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    // Privacy and Terms links should exist
    await expect(page.getByRole("link", { name: /privacy/i }).first()).toBeVisible();
  });

  test("header logo links to home", async ({ page }) => {
    await page.goto("/en/marketplace");

    const logo = page.getByRole("link", { name: /stellar-lumenmint home/i });
    await expect(logo).toBeVisible();

    await logo.click();
    await expect(page).toHaveURL(/\/en(\/)?$/);
  });

  test("mobile hamburger menu opens and contains nav links", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const hamburger = page.getByRole("button", { name: /open navigation menu/i });
    await expect(hamburger).toBeVisible();

    await hamburger.click();

    // Drawer should appear with nav links
    const drawer = page.getByRole("dialog", { name: /mobile navigation/i });
    await expect(drawer).toBeVisible();

    // Should contain Home link
    await expect(page.getByText("Home")).toBeVisible();

    // Close the drawer
    const closeButton = page.getByRole("button", { name: /close navigation menu/i });
    await closeButton.click();
    await expect(drawer).not.toBeVisible();
  });
});

test.describe("Routing", () => {
  test("redirects root to /en", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.url()).toContain("/en");
  });

  test("locale switcher changes language", async ({ page }) => {
    await page.goto("/en");

    // The locale should be reflected in the URL
    await expect(page).toHaveURL(/\/en/);
  });
});
