import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/e2e',
	use: { baseURL: 'http://localhost:5173' },
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: true,
		timeout: 120_000
	},
	timeout: 60_000
});
