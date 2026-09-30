// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Error {
			message: string;
			/** The app's own code could not be fetched (`hooks.client.ts`): the error card waits and retries instead of reporting a fault. */
			unreachable?: boolean;
		}
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
