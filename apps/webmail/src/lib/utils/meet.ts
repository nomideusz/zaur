/**
 * Calendar ↔ Meet helpers. Meeting links are stored in the event `location`
 * field as a same-origin join URL (`/meet/{group}`). Opening one mints a
 * LiveKit access token and joins the room in webmail.
 */

/** Room names: one path segment, no slashes or `.` / `..`. */
export const MEET_GROUP_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/;

/** Old Galene rooms used `https://meet.zaur.app/group/{id}/`. */
const LEGACY_MEET_HOSTS = new Set(['meet.zaur.app']);

export function normalizeMeetBaseUrl(raw: string | null | undefined): string {
	const trimmed = raw?.trim() ?? '';
	if (!trimmed) return '';
	try {
		const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
		url.hash = '';
		url.search = '';
		url.pathname = url.pathname.replace(/\/+$/, '') || '';
		return url.toString().replace(/\/$/, '');
	} catch {
		return '';
	}
}

export function isMeetGroupId(value: string): boolean {
	return MEET_GROUP_RE.test(value);
}

export function meetingJoinPath(group: string): string {
	return `/meet/${group}`;
}

function groupFromPath(pathname: string, prefix: 'meet' | 'group'): string | null {
	const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
	if (parts.length !== 2 || parts[0] !== prefix) return null;
	return isMeetGroupId(parts[1]) ? parts[1] : null;
}

function groupFromUrl(value: string): string | null {
	try {
		const url = new URL(value);
		const meetGroup = groupFromPath(url.pathname, 'meet');
		if (meetGroup) return meetGroup;
		if (!LEGACY_MEET_HOSTS.has(url.host)) return null;
		return groupFromPath(url.pathname, 'group');
	} catch {
		return null;
	}
}

/** True when `value` is a webmail `/meet/{group}` link or a legacy Galene group URL. */
export function isMeetingUrl(value: string | null | undefined): boolean {
	return extractMeetingGroup(value) !== null;
}

/** Extract the room id from location text, or null. */
export function extractMeetingGroup(value: string | null | undefined): string | null {
	const candidate = value?.trim() ?? '';
	if (!candidate) return null;
	const direct = groupFromUrl(candidate);
	if (direct) return direct;

	const meetMatch = candidate.match(/\/meet\/([A-Za-z0-9][A-Za-z0-9._-]{0,62})(?=[/?#\s]|$)/i);
	if (meetMatch && isMeetGroupId(meetMatch[1])) return meetMatch[1];

	const galeneMatch = candidate.match(
		/https?:\/\/meet\.zaur\.app\/group\/([A-Za-z0-9._-]+)/i
	);
	return galeneMatch && isMeetGroupId(galeneMatch[1]) ? galeneMatch[1] : null;
}

function roomSlug(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return `zaur-${Array.from(bytes, (b) => alphabet[b % 36]).join('')}`;
}

/** Absolute join URL stored in the calendar location (ICS-safe). */
export function createMeetingUrl(origin: string): string {
	const base = normalizeMeetBaseUrl(origin);
	if (!base) throw new Error('Meeting origin is not configured');
	return `${base}${meetingJoinPath(roomSlug())}`;
}
