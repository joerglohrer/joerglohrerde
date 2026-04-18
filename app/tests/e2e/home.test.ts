import { expect, test } from '@playwright/test';

test('Home zeigt Hero (Name + Avatar) und neueste Beiträge', async ({ page }) => {
	await page.goto('/');
	// Hero: Name als h1
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	// Hero: Avatar (lokaler fallback oder nostr-profil)
	await expect(page.locator('.hero .avatar')).toBeVisible({ timeout: 15_000 });
	// Neueste-Beiträge-Sektion
	await expect(page.getByRole('heading', { level: 2, name: /Neueste Beiträge/i })).toBeVisible();
	// Mindestens ein Post lädt
	await expect(page.locator('a.card').first()).toBeVisible({ timeout: 15_000 });
});

test('Navigation erreicht Archiv und Impressum', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'Archiv', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: /Archiv/i })).toBeVisible();

	await page.getByRole('link', { name: 'Impressum', exact: true }).first().click();
	await expect(page.getByRole('heading', { level: 1, name: /Impressum/i })).toBeVisible();
});
