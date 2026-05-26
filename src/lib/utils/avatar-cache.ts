const HIT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'zaur:avatar-cache:';

interface CachedAvatar {
	url: string | null;
	expiresAt: number;
}

const cache = new Map<string, CachedAvatar>();
const inflight = new Map<string, Promise<string | null>>();

function key(email: string): string {
	return email.trim().toLowerCase();
}

function isExpired(record: CachedAvatar): boolean {
	return Date.now() > record.expiresAt;
}

function storageKey(email: string): string {
	return `${STORAGE_PREFIX}${email}`;
}

function readStored(cacheKey: string): CachedAvatar | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(storageKey(cacheKey));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as CachedAvatar;
		if (!parsed || typeof parsed.expiresAt !== 'number') return null;
		if (isExpired(parsed)) {
			localStorage.removeItem(storageKey(cacheKey));
			return null;
		}
		return parsed.url === null || typeof parsed.url === 'string' ? parsed : null;
	} catch {
		return null;
	}
}

function writeStored(cacheKey: string, record: CachedAvatar): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(storageKey(cacheKey), JSON.stringify(record));
	} catch {
		// Storage may be disabled or full; in-memory cache still prevents repeat work this session.
	}
}

function getRecord(email: string): CachedAvatar | null {
	const cacheKey = key(email);
	const memory = cache.get(cacheKey);
	if (memory && !isExpired(memory)) return memory;
	if (memory) cache.delete(cacheKey);

	const stored = readStored(cacheKey);
	if (stored) {
		cache.set(cacheKey, stored);
		return stored;
	}
	return null;
}

function setRecord(email: string, url: string | null): void {
	const cacheKey = key(email);
	const record: CachedAvatar = {
		url,
		expiresAt: Date.now() + (url ? HIT_TTL_MS : MISS_TTL_MS)
	};
	cache.set(cacheKey, record);
	writeStored(cacheKey, record);
}

export function getCachedAvatarUrl(email: string | undefined | null): string | null {
	if (!email?.trim()) return null;
	return getRecord(email)?.url ?? null;
}

export function setCachedAvatarUrl(email: string, url: string): void {
	if (!email.trim() || !url) return;
	setRecord(email, url);
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
	const cached = getRecord(email);
	if (cached) {
		return cached.url;
	}

	const existing = inflight.get(cacheKey);
	if (existing) return existing;

	const next = resolveFirstAvailable(urls).then((url) => {
		setRecord(email, url);
		inflight.delete(cacheKey);
		return url;
	});
	inflight.set(cacheKey, next);
	return next;
}
