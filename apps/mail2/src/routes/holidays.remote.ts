/**
 * Public holidays for the calendar, from Nager.Date (date.nager.at, no key).
 * Asked from here rather than the browser: the page's CSP keeps it to our own
 * origin, and one answer per country and year serves everybody.
 */
import * as v from 'valibot';
import { query } from '$app/server';
import { requireSession } from '#lib/server/account';

export interface Holiday {
	/** YYYY-MM-DD */
	date: string;
	/** In the country's own language. */
	localName: string;
	/** In English. */
	name: string;
}

interface NagerHoliday extends Holiday {
	/** False for one only some regions keep. */
	global: boolean;
}

// ponytail: in memory, per process; holidays for a year do not change, a restart re-asks.
const answers = new Map<string, Promise<unknown>>();
function nager<T>(path: string, empty: T): Promise<T> {
	let answer = answers.get(path) as Promise<T> | undefined;
	if (!answer) {
		answer = fetch(`https://date.nager.at/api/v3/${path}`, { signal: AbortSignal.timeout(8000) }).then(async (response) => {
			// 204 / 404: a country (or year) it has nothing for.
			if (response.status === 204 || response.status === 404) return empty;
			if (!response.ok) throw new Error(`Nager.Date answered ${response.status}`);
			return (await response.json()) as T;
		});
		// A failure is not remembered.
		answer.catch(() => answers.delete(path));
		answers.set(path, answer);
	}
	return answer;
}

/** A country's nationwide public holidays in a year. */
export const holidays = query(
	v.object({
		country: v.pipe(v.string(), v.regex(/^[A-Z]{2}$/)),
		year: v.pipe(v.number(), v.integer(), v.minValue(1975), v.maxValue(2075))
	}),
	async ({ country, year }): Promise<Holiday[]> => {
		requireSession();
		const list = await nager<NagerHoliday[]>(`PublicHolidays/${year}/${country}`, []);
		return list.filter((holiday) => holiday.global).map(({ date, localName, name }) => ({ date, localName, name }));
	}
);

/** The countries Nager.Date has holidays for, by name. */
export const holidayCountries = query(async (): Promise<{ code: string; name: string }[]> => {
	requireSession();
	const list = await nager<{ countryCode: string; name: string }[]>('AvailableCountries', []);
	return list.map((country) => ({ code: country.countryCode, name: country.name })).sort((a, b) => a.name.localeCompare(b.name));
});
