/** UTC ISO for tomorrow 09:00 local — the schedule-send default. */
export function tomorrow9ISO(now = Date.now()): string {
	const date = new Date(now);
	date.setDate(date.getDate() + 1);
	date.setHours(9, 0, 0, 0);
	return date.toISOString();
}

export interface SchedulePreset {
	label: string;
	date: Date;
}

/**
 * Schedule presets, recomputed each time the picker opens so relative times
 * stay fresh — ported from webmail 1.0's compose schedule panel.
 */
export function buildSchedulePresets(now = Date.now()): SchedulePreset[] {
	const presets: SchedulePreset[] = [{ label: 'In 1 hour', date: new Date(now + 3_600_000) }];
	const evening = new Date(now);
	evening.setHours(18, 0, 0, 0);
	if (evening.getTime() - now > 5 * 60_000) {
		presets.push({ label: 'This evening', date: evening });
	}
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(9, 0, 0, 0);
	presets.push({ label: 'Tomorrow morning', date: tomorrow });
	return presets;
}

const scheduleTimeFormat = new Intl.DateTimeFormat(undefined, {
	weekday: 'short',
	hour: '2-digit',
	minute: '2-digit'
});

/** Short label for a scheduled time: "Tue 09:00". */
export function formatScheduleTime(date: Date): string {
	return scheduleTimeFormat.format(date);
}

/** Local-time value for a datetime-local minimum (now + 5 minutes). */
export function customSendTimeMin(now = Date.now()): string {
	const min = new Date(now + 5 * 60_000);
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${min.getFullYear()}-${pad(min.getMonth() + 1)}-${pad(min.getDate())}T${pad(min.getHours())}:${pad(min.getMinutes())}`;
}

/** The server needs lead time — refuse anything sooner than a minute out. */
export function isSendAtValid(date: Date, now = Date.now()): boolean {
	return date.getTime() >= now + 60_000;
}
