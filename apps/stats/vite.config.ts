import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Sign-out posts to /auth/logout, which redirects to mail's end-session page, and
// Chromium holds a form's redirects to form-action too. Read at build time.
const issuer = new URL(process.env.OIDC_ISSUER?.trim() || 'https://webmail.zaur.app').origin as `${string}.${string}`;

export default defineConfig({
	server: { fs: { allow: ['../../packages/ui'] } },
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			compilerOptions: {
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			// The beacon is a cross-site text/plain POST, which kit's origin check would
			// refuse; hooks.server.ts redoes that check for everything but /api/hit.
			csrf: { trustedOrigins: ['*'] },
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					'form-action': ['self', issuer],
					'object-src': ['none']
				}
			}
		})
	]
});
