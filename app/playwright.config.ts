import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/e2e',
	// locale fest auf deutsch: die UI folgt navigator.language, und die tests
	// pruefen deutsche labels — sonst haengt das ergebnis vom host-system ab.
	use: { baseURL: 'http://localhost:5173', locale: 'de-DE' },
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: true,
		timeout: 120_000
	},
	timeout: 60_000
});
