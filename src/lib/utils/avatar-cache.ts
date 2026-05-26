const cache = new Map<string, string>();

function key(email: string): string {
	return email.trim().toLowerCase();
}

export function getCachedAvatarUrl(email: string | undefined | null): string | null {
	if (!email?.trim()) return null;
	return cache.get(key(email)) ?? null;
}

export function setCachedAvatarUrl(email: string, url: string): void {
	if (!email.trim() || !url) return;
	cache.set(key(email), url);
}
