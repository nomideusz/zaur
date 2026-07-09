/** JMAP UTCDate → value for `<input type="date">` (or '' when unset). */
export function vacationDateInputValue(utcDate: string | null | undefined): string {
	return utcDate ? utcDate.slice(0, 10) : '';
}

/**
 * `<input type="date">` value → JMAP UTCDate. Start dates begin at midnight,
 * end dates run to the end of the chosen day so "until July 20" includes July 20.
 */
export function vacationDateToUtc(value: string, edge: 'start' | 'end'): string | null {
	if (!value) return null;
	return edge === 'start' ? `${value}T00:00:00Z` : `${value}T23:59:59Z`;
}
