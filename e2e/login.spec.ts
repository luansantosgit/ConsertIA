import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form with email and password inputs', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput).toBeVisible();

    const loginButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    await expect(loginButton).toBeVisible();
  });
});
