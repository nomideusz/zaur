import { invalidate } from '$app/navigation';

/** A period page stays open for hours: it re-reads itself every 15 s while in view. */
export function reloading(): void {
	$effect(() => {
		const t = setInterval(() => {
			if (document.visibilityState === 'visible') void invalidate('stats:data');
		}, 15_000);
		return () => clearInterval(t);
	});
}
