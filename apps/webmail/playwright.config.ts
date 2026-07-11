import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

function loadEnvFile(path: string) {
	if (!existsSync(path)) return;
	for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const index = trimmed.indexOf('=');
		if (index < 0) continue;
		const key = trimmed.slice(0, index).trim();
		const value = trimmed.slice(index + 1).trim();
		if (key && process.env[key] === undefined) process.env[key] = value;
	}
}

loadEnvFile('.env.e2e.local');

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	workers: 1,
	timeout: 60_000,
	expect: {
		timeout: 15_000
	},
	use: {
		baseURL: 'http://127.0.0.1:4174',
		trace: 'retain-on-failure'
	},
	webServer: {
		command: 'pnpm dev --host 127.0.0.1 --port 4174',
		url: 'http://127.0.0.1:4174',
		reuseExistingServer: !process.env.CI,
		env: {
			// Spread explicitly — Playwright does not merge process.env when env is set,
			// and the @auth tests need the STALWART_OAUTH_*/SESSION_SECRET vars from CI.
			...(process.env as Record<string, string>),
			PUBLIC_JMAP_SERVER_URL: process.env.PUBLIC_JMAP_SERVER_URL ?? 'https://mail.zaur.app'
		}
	},
	projects: [
		// Signs in once (tagged @auth so it's selected/skipped alongside the auth tests).
		{ name: 'auth-setup', testMatch: /auth\.setup\.ts/ },
		// Authenticated tests reuse the stored session — no per-test login.
		{
			name: 'auth',
			testMatch: /webmail\.spec\.ts/,
			use: { ...devices['Desktop Chrome'], storageState: 'test-results/.auth/mail.json' },
			dependencies: ['auth-setup']
		},
		// Everything else (the *-lab specs) runs unauthenticated.
		{
			name: 'chromium',
			testIgnore: [/auth\.setup\.ts/, /webmail\.spec\.ts/],
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
