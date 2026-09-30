/**
 * Going to a page without risking the one that is playing.
 *
 * What keeps the music safe is that the root layout has no server load (every
 * page's own load names who is signed in). With one, a page whose data cannot
 * be fetched leaves Kit asking the server for the error page's data as well,
 * and failing that it loads the address afresh: the offline page or a
 * gateway's "Bad Gateway" where the app — and the music — was. Without one
 * Kit puts up the app's own error page, which has "Try again".
 *
 * On top of that, a link or a goto() fetches the page's data before it goes
 * (Kit keeps it for the navigation that follows, so nothing is asked for
 * twice), and when the server does not answer the app stays where it is and
 * says so. Back and Forward are left to Kit: holding them means undoing the
 * browser's step and making it again, which is a race that cannot be won from
 * here. Out of reach, they land on the error page.
 */
import { goto, preloadData } from '$app/navigation';
import { page } from '$app/state';
import { reachable, reached, unreachable } from '#lib/api';

class Way {
	/** Where a navigation still fetching its data is headed: the layout lights that section. */
	to = $state<URL>();
	#fetched = '';

	/** Fetch the page's data. False when the server is out of reach, or a newer navigation took over. */
	async fetch(url: URL): Promise<boolean> {
		this.to = url;
		// An address that is none of the app's routes rejects, and is not for this to judge.
		const result = await preloadData(url.href).catch(() => null);
		if (this.to !== url) return false;
		this.to = undefined;
		// A page's own error (not found, the library down) has its page in the app.
		// Only a server that does not answer at all is a reason to stay: Kit says "Internal Error"
		// for that (no network, a gateway's page), and then /health is asked who is there.
		if (result?.type === 'error' && result.error.message === 'Internal Error' && !(await reachable())) {
			unreachable();
			return false;
		}
		reached();
		this.#fetched = url.href;
		return true;
	}

	/** Back or Forward pressed while a page is being fetched: that page is no longer wanted. */
	drop(): void {
		this.to = undefined;
	}

	/** Whether this is the navigation its data was just fetched for (true once). */
	fetched(url: URL): boolean {
		const yes = url.href === this.#fetched;
		this.#fetched = '';
		return yes;
	}
}

export const way = new Way();

/** One step back in history; resolves when the browser has taken it. Asked twice meanwhile (a double tap), it is still one step. */
let stepping: Promise<void> | undefined;
const back = (): Promise<void> =>
	(stepping ??= new Promise((done) => {
		addEventListener('popstate', () => ((stepping = undefined), done()), { once: true });
		history.back();
	}));

/**
 * goto() that waits for the page to be had. Any other navigation is caught by
 * the layout's beforeNavigate and handed to this.
 *
 * Now playing, a menu and a card are history entries of their own on top of
 * the page's. Leaving through a link inside one (or `/`), the layer is closed
 * first, by the Back that would close it, and the page becomes a new entry
 * after the one it lay on. Replacing the layer's entry instead looks the same
 * until Back is pressed: Kit takes the step from the new page for a step out
 * of a layer, and changes the address but not the screen.
 */
export async function visit(href: string, options?: Parameters<typeof goto>[1]): Promise<void> {
	const url = new URL(href, location.href);
	// A link to the page already open ("Go to artist" on that artist's page) only closes the layer.
	const here = url.href === location.href;
	if (!here && !(await way.fetch(url))) return;
	if (page.state.nowPlaying || page.state.sheet) await back();
	if (!here) await goto(url, options);
}

/** The same care for loading this page's data again (invalidateAll, refreshAll): asked first whether anyone is there. */
export async function reload(again: () => Promise<unknown>): Promise<void> {
	if (!(await reachable())) return unreachable();
	reached();
	await again().catch(() => {});
}
