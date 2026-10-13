import { expect, test } from '@playwright/test';

test('Clientseitige Navigation Home → Post laedt den Artikel ohne Reload', async ({ page }) => {
	await page.goto('/');
	const first = page.locator('a.card').first();
	const title = (await first.locator('h2').textContent())?.trim();
	await first.click();
	await expect(page).toHaveURL(/\/[^/]+\/$/);
	await expect(page.locator('h1.post-title')).toHaveText(title ?? '', { timeout: 15_000 });
	// Markdown-body ist vorgerendert, kommentar-block laedt nach.
	await expect(page.locator('article .body')).not.toBeEmpty();
	await expect(page.getByRole('heading', { level: 3, name: /Kommentare/ })).toBeVisible({ timeout: 15_000 });
});

test('Unbekannter Pfad zeigt die 404-Seite', async ({ page }) => {
	await page.goto('/diesen-post-gibt-es-nicht/');
	await expect(page.getByRole('heading', { level: 1, name: /Seite nicht gefunden/ })).toBeVisible({
		timeout: 15_000
	});
});
