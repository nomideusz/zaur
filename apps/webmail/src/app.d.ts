import 'vite-plugin-pwa/client';
import 'vite-plugin-pwa/info';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	/**
	 * Svelte 5 SVG attribute typings in this project do not include a few
	 * commonly forwarded props used by icon components.
	 */
	namespace svelteHTML {
		interface SVGAttributes<T> {
			class?: string;
			fill?: string;
			'aria-hidden'?: boolean | 'true' | 'false';
			'aria-label'?: string;
		}
	}
}

export {};
