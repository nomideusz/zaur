// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** Thread open in the reader. A history entry on phones, so Back closes it. */
			reader?: string;
			/** A full-screen layer open over the page (`#lib/back-layer.svelte.ts`), so Back closes it. */
			layer?: string;
		}
		// interface Platform {}
	}
}

export {};
