import { expect, test } from '@playwright/test';

test('Einzelpost rendert Titel und Markdown-Body', async ({ page }) => {
	await page.goto('/dezentrale-oep-oer/');
	// Titel steht einmal als .post-title (H1 außerhalb des Artikels),
	// und nochmal im Markdown-Body des Events — wir prüfen den ersten.
	await expect(page.locator('h1.post-title')).toBeVisible({ timeout: 15_000 });
	await expect(page.locator('h1.post-title')).toContainText('Gemeinsam die Bildungszukunft');
	await expect(page.locator('article')).toContainText('Open Educational');
});

test('Legacy-URL wird auf kurze Form umgeleitet', async ({ page }) => {
	await page.goto('/2025/03/04/dezentrale-oep-oer.html/');
	await expect(page).toHaveURL(/\/dezentrale-oep-oer\/$/);
	await expect(page.locator('h1.post-title')).toBeVisible({ timeout: 15_000 });
});
