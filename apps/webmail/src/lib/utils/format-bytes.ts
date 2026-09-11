const UNITS = ['KB', 'MB', 'GB', 'TB', 'PB'] as const;

/**
 * Human-readable byte size using binary (1024-based) units.
 *
 * Deliberately NOT Ark UI's `Format.Byte`: it rounds to three significant
 * figures (1023 B renders as "1,020 B") and emits locale casing ("kB"), which
 * would misreport small sizes. The app ships a single locale, so an exact,
 * predictable formatter is preferable. Kept in one place so the sidebar quota,
 * settings quota, attachments and file browser all agree.
 *
 * Returns an empty string for missing/invalid/negative input so callers can
 * fall back (e.g. `formatBytes(node.size) || 'File'`).
 */
export function formatBytes(bytes: number | null | undefined): string {
	if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '';
	if (bytes < 1024) return `${Math.round(bytes)} B`;

	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit += 1;
	}

	const digits = value >= 100 ? 0 : 1;
	return `${Number(value.toFixed(digits))} ${UNITS[unit]}`;
}
