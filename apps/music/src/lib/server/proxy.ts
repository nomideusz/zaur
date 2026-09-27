const PASS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];

/** Pipe a Navidrome binary answer (audio, artwork) through, Range and all. */
export async function pipe(url: string, request: Request, cacheControl: string): Promise<Response> {
	const range = request.headers.get('range');
	const upstream = await fetch(url, { headers: range ? { range } : {}, signal: request.signal });
	const headers = new Headers({ 'cache-control': cacheControl });
	for (const name of PASS) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(upstream.body, { status: upstream.status, headers });
}
