/**
 * Going to a page without risking the one that is playing. Kit answers a page
 * whose data it cannot fetch with a full page load, and with the server out of
 * reach that load is the offline page or a gateway's "Bad Gateway": the app
 * replaced, the music stopped. So a page's data is fetched before it is gone
 * to (Kit keeps it for the navigation that follows, so nothing is asked for
 * twice), and when the server does not answer the app stays where it is and
 * says so.
 */
import { goto, preloadData } from '$app/navigation';
import { reachable, unreachable } from '#lib/api';

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
		// Only a server that does not answer at all is a reason to stay.
		if (result?.type === 'error' && !(await reachable())) {
			unreachable();
			return false;
		}
		this.#fetched = url.href;
		return true;
	}

	/** Whether this is the navigation its data was just fetched for (true once). */
	fetched(url: URL): boolean {
		const yes = url.href === this.#fetched;
		this.#fetched = '';
		return yes;
	}
}

export const way = new Way();

/**
 * goto() that waits for the page to be had. Any other navigation is caught by
 * the layout's beforeNavigate and made again; this one keeps its options and
 * resolves when it is over.
 */
export async function visit(href: string, options?: Parameters<typeof goto>[1]): Promise<void> {
	const url = new URL(href, location.href);
	if (await way.fetch(url)) await goto(url, options);
}

/** The same care for loading this page's data again (invalidateAll, refreshAll): asked first whether anyone is there. */
export async function reload(again: () => Promise<unknown>): Promise<void> {
	if (await reachable()) await again().catch(() => {});
	else unreachable();
}
