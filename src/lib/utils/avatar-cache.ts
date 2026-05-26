const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function key(email: string): string {
	return email.trim().toLowerCase();
}

export function getCachedAvatarUrl(email: string | undefined | null): string | null {
	if (!email?.trim()) return null;
	const cached = cache.get(key(email));
	return cached ?? null;
}

export function setCachedAvatarUrl(email: string, url: string): void {
	if (!email.trim() || !url) return;
	cache.set(key(email), url);
}

function loadImage(url: string): Promise<string | null> {
	return new Promise((resolve) => {
		const image = new Image();
		image.decoding = 'async';
		image.referrerPolicy = 'no-referrer';
		image.onload = () => resolve(url);
		image.onerror = () => resolve(null);
		image.src = url;
	});
}

async function resolveFirstAvailable(urls: string[]): Promise<string | null> {
	for (const url of urls) {
		const loaded = await loadImage(url);
		if (loaded) return loaded;
	}
	return null;
}

export async function resolveCachedAvatarUrl(
	email: string | undefined | null,
	urls: string[]
): Promise<string | null> {
	if (!email?.trim() || !urls.length) return null;

	const cacheKey = key(email);
	if (cache.has(cacheKey)) {
		return cache.get(cacheKey) ?? null;
	}

	const existing = inflight.get(cacheKey);
	if (existing) return existing;

	const next = resolveFirstAvailable(urls).then((url) => {
		cache.set(cacheKey, url);
		inflight.delete(cacheKey);
		return url;
	});
	inflight.set(cacheKey, next);
	return next;
}
