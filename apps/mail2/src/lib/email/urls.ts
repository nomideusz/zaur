/**
 * Where a URL written in a message would send the browser.
 *
 * The mail frame resolves URLs against the app and sends the reader's cookies
 * with them, so an address of the app's own is never the message's to use:
 * `<img src="/oidc/logout">` was a sign-out on open. The URL parser decides,
 * resolving the way the frame does, not a prefix test: `HTTPS://`, a leading
 * space, `//host`, `\\host`, `/\host`, `?x` and the empty string (the document
 * itself) are all requests somewhere.
 */

/** `app`: this app. `remote`: another server. `inert`: no request at all (`data:`, `cid:`, `tel:`). */
export type UrlKind = 'app' | 'remote' | 'inert';

export function classifyUrl(raw: string, appOrigin: string): UrlKind {
	try {
		const url = new URL(raw, `${appOrigin}/`);
		if (!/^https?:$/.test(url.protocol)) return 'inert';
		// By host, not origin: cookies do not know about ports or schemes. `host.` is the same server.
		return url.hostname.replace(/\.$/, '') === new URL(appOrigin).hostname ? 'app' : 'remote';
	} catch {
		// What the parser cannot read is not kept either.
		return 'app';
	}
}

/**
 * A `srcset` is as bad as its worst URL. Split as the HTML spec splits it — a
 * URL is a run of non-whitespace, commas at its end close the candidate,
 * descriptors run to the next comma — so that in `a.png, 2x` the `2x` is seen
 * for what the browser takes it for: a second, relative URL.
 */
export function classifySrcset(value: string, appOrigin: string): UrlKind {
	const kinds = Array.from(value.matchAll(/[ \t\n\f\r,]*([^ \t\n\f\r]*[^ \t\n\f\r,])(?:,+|[^,]*)/g), (match) =>
		classifyUrl(match[1], appOrigin)
	);
	return kinds.includes('app') ? 'app' : kinds.includes('remote') ? 'remote' : 'inert';
}

/** Where inline (`cid:`) images are served from; mail-core's mapper writes it into the body. */
export const INLINE_IMAGE_PATH = '/api/jmap/download';

/**
 * The one address of the app's a message body may hold: an inline image, as
 * the mapper writes it in place of `cid:` (and `thread` in mail.remote.ts adds
 * `account` to, for a shared mailbox). Returned rebuilt from those parts, so
 * nothing else rides along. It reads a blob the reader can already open and
 * changes nothing.
 */
export function inlineImageSrc(raw: string, appOrigin: string): string | null {
	try {
		const url = new URL(raw, `${appOrigin}/`);
		const from = url.searchParams;
		if (url.origin !== appOrigin || url.pathname !== INLINE_IMAGE_PATH) return null;
		if (!from.get('blobId') || !from.get('type')?.startsWith('image/') || from.get('inline') !== '1') return null;
		const query = new URLSearchParams();
		for (const key of ['account', 'blobId', 'name', 'type', 'inline']) {
			const value = from.get(key);
			if (value) query.set(key, value);
		}
		return `${INLINE_IMAGE_PATH}?${query}`;
	} catch {
		return null;
	}
}

// ponytail: today's `+server.ts` directories; a new one needs adding here. The
// real guard is the endpoint not acting on a bare GET.
const APP_ENDPOINT = /^\/+(api|oidc|auth)(\/|$)/i;

/**
 * Whether a link in a message keeps its address. Other sites do. This app only
 * when the message names it in full and means a page (our own Meet
 * invitations do): a relative link was never written for this origin, it only
 * lands here because the mail is shown here, and an endpoint is one click from
 * acting — `/oidc/logout`.
 */
export function linkAllowed(raw: string, appOrigin: string): boolean {
	if (classifyUrl(raw, appOrigin) !== 'app') return true;
	try {
		const url = new URL(raw);
		// `http:/oidc/logout` parses alone, as another host; against the app it is relative.
		// The path is decoded as the router decodes it: `/%6fidc/logout` is the same route.
		return url.href === new URL(raw, `${appOrigin}/`).href && !APP_ENDPOINT.test(decodeURI(url.pathname));
	} catch {
		return false;
	}
}
