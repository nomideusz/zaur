import { sveltekit } from '@sveltejs/kit/vite';
import { geometrize } from '@nomideusz/svelte-geometrize/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// geometrize fits the `?geometrize` imports at build time (LiveGeometrize.svelte).
	plugins: [geometrize(), sveltekit()]
});
