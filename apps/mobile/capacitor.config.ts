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
		// Mail (the SvelteKit app) on the host it shares with Stalwart (mail2 README,
		// "One host with Stalwart"); webmail.zaur.app only redirects here now.
		url: 'https://mail.zaur.app',
		// Signup lives on register.zaur.app; keep it in the WebView so the sign-in
		// page's "Get your address" link and mail's /register redirect don't pop
		// out to the system browser. Stalwart's sign-in page (passkeys) is on this
		// same host, so it stays in the WebView too.
		// iOS: mirror this list in WKAppBoundDomains when the ios/ project lands.
		allowNavigation: ['register.zaur.app'],
		errorPath: 'offline.html'
	},
	ios: {
		// Required for service workers (offline PWA cache) inside WKWebView.
		limitsNavigationsToAppBoundDomains: true
	}
};

export default config;
