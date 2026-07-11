import type { CapacitorConfig } from '@capacitor/cli';

// ponytail: remote-URL shell — the app loads the live webmail instead of
// bundling assets, because webmail is SSR (adapter-node) and can't be built
// static without refactoring auth/JMAP proxying. Revisit (bundled SPA + direct
// Stalwart OAuth) if Apple review or offline cold-start becomes a problem.
const config: CapacitorConfig = {
	appId: 'app.zaur.mail',
	appName: 'Zaur Mail',
	webDir: 'www',
	server: {
		url: 'https://mail.zaur.app',
		errorPath: 'offline.html'
	},
	ios: {
		// Required for service workers (offline PWA cache) inside WKWebView.
		limitsNavigationsToAppBoundDomains: true
	}
};

export default config;
