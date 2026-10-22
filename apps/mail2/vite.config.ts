import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// SvelteKit 3: configuration lives here, not in svelte.config.js (which is no
// longer read). `adapter` and `experimental` are top-level plugin options; the
// `experimental` namespace is shared with vite-plugin-svelte.
export default defineConfig({
	server: {
		// Vite rejects requests whose Host header is neither localhost nor in
		// this list — this is the cloudflared tunnel name used for
		// on-the-internet testing (README → "Testing over the network").
		allowedHosts: ['mail2-dev.zaur.app'],
		// The design system's fonts live in packages/ui (@zaur/ui).
		fs: { allow: ['../../packages/ui'] }
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: {
					async: true
				}
			},
			// Kit's form origin check, redone in hooks.server.ts so /oidc/token can skip it.
			csrf: { trustedOrigins: ['*'] },
			// Kit nonces its own inline scripts and app.html's (`%sveltekit.nonce%`);
			// styles keep 'unsafe-inline' — Svelte, Trix and mail bodies all use inline style.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					// Remote images in mail (behind the Show images banner), previews as blob:.
					'img-src': ['self', 'data:', 'blob:', 'https:'],
					'font-src': ['self'],
					// Attachment previews are blob: URLs; Meet's camera tiles are mediastream:.
					'media-src': ['self', 'blob:', 'mediastream:'],
					// Meet talks to LiveKit Cloud (signal over wss, region lookup over
					// https, TURN relays). Traceway's origin, which takes the browser's
					// error reports, is added at runtime from PUBLIC_TRACEWAY_DSN (hooks.server.ts).
					'connect-src': [
						'self',
						'https://*.livekit.cloud',
						'wss://*.livekit.cloud',
						'https://*.turn.livekit.cloud',
						'wss://*.turn.livekit.cloud'
					],
					'worker-src': ['self', 'blob:'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'object-src': ['none']
				}
			},
			experimental: {
				remoteFunctions: true
			},
			// Spans for handle/load/remote calls, exported by src/instrumentation.server.ts.
			tracing: {
				server: true
			}
		})
	]
});
