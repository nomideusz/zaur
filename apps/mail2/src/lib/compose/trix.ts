let loading: Promise<void> | undefined;

/**
 * The editor: a chunk of its own, fetched by the first panel — or before it,
 * by a page that expects one — and set up once, before any editor draws.
 * It can fail by itself (offline, a deploy that retired the chunk); the next
 * call tries again.
 */
export function loadTrix(): Promise<void> {
	return (loading ??= import('trix').then(
		({ default: Trix }) => {
			// The name and size under an image are editor furniture, not part of the letter.
			Trix.config.attachments.preview.caption = { name: false, size: false };
		},
		(cause) => {
			loading = undefined;
			throw cause;
		}
	));
}
