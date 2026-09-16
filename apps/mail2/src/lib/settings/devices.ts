/**
 * A signed-in device, described from its user agent. The point is to let
 * someone recognise "Firefox on Windows" in the sessions list, not to fingerprint;
 * anything unrecognised falls back to the family it can name.
 */
export function describeUserAgent(userAgent: string | null | undefined): string {
	const ua = (userAgent ?? '').trim();
	if (!ua) return 'Unknown device';

	const browser =
		/Edg(?:e|A|iOS)?\//.test(ua) ? 'Edge'
		: /OPR\/|Opera/.test(ua) ? 'Opera'
		: /SamsungBrowser/.test(ua) ? 'Samsung Internet'
		: /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
		: /CriOS\//.test(ua) ? 'Chrome'
		: /Chrome\/|Chromium\//.test(ua) ? 'Chrome'
		: /Safari\//.test(ua) && /Version\//.test(ua) ? 'Safari'
		: /Thunderbird/.test(ua) ? 'Thunderbird'
		: null;

	const os =
		/iPhone|iPad|iPod/.test(ua) ? 'iOS'
		: /Android/.test(ua) ? 'Android'
		: /Windows NT/.test(ua) ? 'Windows'
		: /Mac OS X|Macintosh/.test(ua) ? 'macOS'
		: /CrOS/.test(ua) ? 'ChromeOS'
		: /Linux/.test(ua) ? 'Linux'
		: null;

	if (browser && os) return `${browser} on ${os}`;
	if (browser) return browser;
	if (os) return `Browser on ${os}`;
	// A non-browser client: keep whatever product token it leads with.
	const product = ua.split(/[\s/(]/)[0];
	return product && product.length <= 40 ? product : 'Unknown device';
}

/** "just now", "3 min ago", "2 h ago", "yesterday", else a short date. */
export function relativeTime(epochMs: number, now = Date.now()): string {
	const delta = Math.max(0, now - epochMs);
	const minute = 60_000;
	if (delta < minute) return 'just now';
	if (delta < 60 * minute) return `${Math.round(delta / minute)} min ago`;
	if (delta < 24 * 60 * minute) return `${Math.round(delta / (60 * minute))} h ago`;
	if (delta < 48 * 60 * minute) return 'yesterday';
	if (delta < 30 * 24 * 60 * minute) return `${Math.round(delta / (24 * 60 * minute))} days ago`;
	return new Date(epochMs).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
