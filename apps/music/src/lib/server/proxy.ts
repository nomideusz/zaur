const PASS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];

/** Pipe a Navidrome binary answer (audio, artwork) through, Range and all. */
export async function pipe(url: string, request: Request, cacheControl: string): Promise<Response> {
	const range = request.headers.get('range');
	// Navidrome down is a bad gateway, not this app crashing.
	const upstream = await fetch(url, { headers: range ? { range } : {}, signal: request.signal }).catch(() => undefined);
	if (!upstream) return new Response('The library is unreachable', { status: 502 });
	// Only a good answer is worth keeping: a cached 404 would hide the cover for a week.
	const headers = new Headers({ 'cache-control': upstream.ok ? cacheControl : 'no-store' });
	for (const name of PASS) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(upstream.body, { status: upstream.status, headers });
}
