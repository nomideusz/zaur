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
