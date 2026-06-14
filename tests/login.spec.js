import { test, expect } from '@playwright/test';

test('Admin Login Test', async ({ page }) => {
  await page.goto('http://localhost:5173/login');

  await page.getByLabel('Email Address')
    .fill('shrikantdeshmukh2409@gmail.com');

  await page.getByLabel('Password')
    .fill('Shrikant@123');

  await page.getByRole('button', { name: /sign in/i })
    .click();

  await expect(page).toHaveURL('http://localhost:5173/');

  await expect(
    page.getByRole('link', { name: /admin/i })
  ).toBeVisible();
});