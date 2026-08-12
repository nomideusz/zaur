/**
 * Calendar ↔ Jitsi helpers. Meeting links are stored in the event `location`
 * field as a full URL on the configured PUBLIC_JITSI_URL host.
 */

export function normalizeJitsiBaseUrl(raw: string | null | undefined): string {
	const trimmed = raw?.trim() ?? '';
	if (!trimmed) return '';
	try {
		const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
		url.hash = '';
		url.search = '';
		url.pathname = url.pathname.replace(/\/+$/, '') || '';
		// Drop a trailing slash from the serialized form.
		return url.toString().replace(/\/$/, '');
	} catch {
		return '';
	}
}

export function isJitsiConfigured(baseUrl: string | null | undefined): boolean {
	return Boolean(normalizeJitsiBaseUrl(baseUrl));
}

/** True when `value` is a meeting URL on our Jitsi host (path = room). */
export function isJitsiMeetingUrl(
	value: string | null | undefined,
	baseUrl: string | null | undefined
): boolean {
	const base = normalizeJitsiBaseUrl(baseUrl);
	const candidate = value?.trim() ?? '';
	if (!base || !candidate) return false;
	try {
		const meeting = new URL(candidate);
		const host = new URL(base);
		if (meeting.protocol !== host.protocol || meeting.host !== host.host) return false;
		const room = meeting.pathname.replace(/^\/+|\/+$/g, '');
		return room.length > 0 && !room.includes('/');
	} catch {
		return false;
	}
}

/** Extract a Jitsi meeting URL from location text, or null. */
export function extractJitsiMeetingUrl(
	location: string | null | undefined,
	baseUrl: string | null | undefined
): string | null {
	const base = normalizeJitsiBaseUrl(baseUrl);
	const candidate = location?.trim() ?? '';
	if (!base || !candidate) return null;
	if (isJitsiMeetingUrl(candidate, base)) {
		const room = new URL(candidate).pathname.replace(/^\/+|\/+$/g, '');
		return `${base}/${room}`;
	}
	// Location may be free text containing the URL.
	const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = candidate.match(new RegExp(`${escaped}/([A-Za-z0-9._-]+)`, 'i'));
	return match ? `${base}/${match[1]}` : null;
}

function roomSlug(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return `zaur-${Array.from(bytes, (b) => alphabet[b % 36]).join('')}`;
}

export function createJitsiMeetingUrl(baseUrl: string): string {
	const base = normalizeJitsiBaseUrl(baseUrl);
	if (!base) throw new Error('Jitsi base URL is not configured');
	return `${base}/${roomSlug()}`;
}
