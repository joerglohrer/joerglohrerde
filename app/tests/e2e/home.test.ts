import { expect, test } from '@playwright/test';

test('Home zeigt Profil und mindestens einen Post', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1, name: /Beiträge/ })).toBeVisible();
	await expect(page.locator('.profile .name')).toBeVisible({ timeout: 15_000 });
	await expect(page.locator('a.card').first()).toBeVisible({ timeout: 15_000 });
});
