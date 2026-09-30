import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Sign-out posts to /auth/logout, which answers with a redirect to mail's end-session page, and
// Chromium holds a form's redirects to form-action too. Read when this file is: at build time.
const issuer = new URL(process.env.OIDC_ISSUER?.trim() || 'https://webmail.zaur.app').origin as `${string}.${string}`;

// SvelteKit 3: configuration lives here, as in mail2.
export default defineConfig({
	// The design tokens and fonts are mail2's (layout.css imports them); the dev server has to be allowed to serve them.
	server: { fs: { allow: ['../mail2/src/routes/styles'] } },
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					// i.ytimg.com: thumbnails of the Add page's YouTube search results.
					'img-src': ['self', 'data:', 'blob:', 'https://i.ytimg.com', 'https://cdn-images.dzcdn.net', 'https://e-cdns-images.dzcdn.net'],
					'font-src': ['self'],
					'media-src': ['self', 'blob:'],
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
