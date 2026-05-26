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
			PUBLIC_JMAP_SERVER_URL: process.env.PUBLIC_JMAP_SERVER_URL ?? 'https://mail.zaur.app'
		}
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
