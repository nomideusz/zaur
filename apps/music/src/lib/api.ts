import { notice, notify } from '#lib/notice.svelte';

/**
 * fetch for our own /api: a 401 means the week-long session cookie ran out, so
 * go through sign-in and come back here (the queue survives the reload).
 */
export async function api(path: string, init?: RequestInit): Promise<Response> {
	const response = await fetch(path, init);
	if (response.status === 401) signIn();
	return response;
}

export function signIn(): void {
	location.href = `/auth/login?next=${encodeURIComponent(location.pathname + location.search)}`;
}

/** POST JSON to /api; resolves to whether it worked (never throws). */
export const post = (path: string, body: unknown): Promise<boolean> =>
	api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(
		(response) => response.ok,
		() => false
	);

/**
 * Whether our own server answers. No network, a dead zone with signal bars and
 * a gateway's 502 while the app restarts are all "no": navigator.onLine knows
 * only the first.
 */
export const reachable = (): Promise<boolean> =>
	fetch('/health', { cache: 'no-store', signal: AbortSignal.timeout(8000) }).then(
		(response) => response.ok,
		() => false
	);

const AWAY = ["You're offline", "Can't reach the library"];

/** What the status line says when it does not… */
export const unreachable = (): void => notify(AWAY[Number(navigator.onLine)], 6000);

/** …and stops saying once a page has come after all, rather than when its six seconds are up. */
export function reached(): void {
	if (AWAY.includes(notice.text)) notify('', 0);
}

/**
 * For a form that posts the old way (sign out): sent to a server that is not
 * there, it would leave the browser's error page where the app — and the
 * music — was.
 */
export async function submit(event: SubmitEvent): Promise<void> {
	event.preventDefault();
	// Read now: the event has let go of it by the time the answer is in.
	const form = event.currentTarget as HTMLFormElement;
	if (await reachable()) form.submit();
	else unreachable();
}
