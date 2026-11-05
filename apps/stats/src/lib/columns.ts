/** The scale and the dates under a chart of columns: one a day, or one an hour for today alone. */
import { addDayStr, hourLabel, shortDay } from './format';

/** Clean whole numbers from zero to at or above the peak, at most five of them. */
export function axisTicks(peak: number): number[] {
	const top = Math.max(1, peak);
	const power = 10 ** Math.floor(Math.log10(top));
	const step = [1, 2, 5, 10, 20, 50, 100].map((m) => (m * power) / 10).find((s) => s >= 1 && Math.ceil(top / s) <= 4)!;
	return Array.from({ length: Math.ceil(top / step) + 1 }, (_, i) => i * step);
}

export interface ColumnTick {
	/** The slot it stands under. */
	i: number;
	label: string;
	/** A weekday, over the date, when every day gets a label. */
	over?: string;
	/** Dropped on a phone, where these would touch. */
	minor?: boolean;
}

const weekday = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short' });

/** Today by the quarter of its day, a week by every day, and longer periods by their Mondays. */
export function columnTicks(days: number, from: string): ColumnTick[] {
	if (days === 1) return [0, 6, 12, 18].map((i) => ({ i, label: hourLabel(i) }));
	const all = Array.from({ length: days }, (_, i) => ({ i, day: addDayStr(from, i) }));
	if (days <= 7) return all.map(({ i, day }) => ({ i, label: shortDay(day), over: weekday(day) }));
	const mondays = all.filter(({ day }) => new Date(`${day}T12:00:00Z`).getUTCDay() === 1);
	const shown = days > 30 ? mondays.filter((_, n) => n % 2 === 0) : mondays;
	return shown.map(({ i, day }, n) => ({ i, label: shortDay(day), minor: days > 30 && n % 2 === 1 }));
}
