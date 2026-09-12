/** UTC ISO for tomorrow 09:00 local — the schedule-send default. */
export function tomorrow9ISO(now = Date.now()): string {
	const date = new Date(now);
	date.setDate(date.getDate() + 1);
	date.setHours(9, 0, 0, 0);
	return date.toISOString();
}
