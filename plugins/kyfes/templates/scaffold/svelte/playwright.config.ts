import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		locale: 'it-IT',
		trace: 'on-first-retry'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	// Dev server with MSW mocks (PUBLIC_API_MOCKS=true): no backend needed.
	webServer: {
		command: `vite dev --port ${PORT} --strictPort`,
		port: PORT,
		reuseExistingServer: !process.env.CI,
		env: { PUBLIC_API_MOCKS: 'true' }
	}
});
