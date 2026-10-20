/**
 * Public holidays as a calendar of their own: not a JMAP one, but drawn and
 * toggled like one. Read-only, kept in the account's prefs (country, shown),
 * and its events built here from what `holidays.remote.ts` answers.
 */
import type { Calendar, CalendarEvent } from '@zaur/mail-core';
import type { Holiday } from '../../routes/holidays.remote';

/** No JMAP account is called this; it keys the holidays calendar apart from every real one. */
export const HOLIDAYS_ACCOUNT = 'zaur:holidays';

export const isHolidays = (calendar: Pick<Calendar, 'accountId'>) => calendar.accountId === HOLIDAYS_ACCOUNT;

/** The country to show: the pref, else the region this browser's language names (`pl` → PL). */
export function holidayCountry(pref: string, language: string | undefined): string | null {
	if (pref === 'none') return null;
	if (pref) return pref;
	try {
		const region = language ? new Intl.Locale(language).maximize().region : undefined;
		// `es-419` names a continent, not a country.
		return region && /^[A-Z]{2}$/.test(region) ? region : null;
	} catch {
		return null;
	}
}

export function countryName(code: string): string {
	try {
		return new Intl.DisplayNames('en', { type: 'region' }).of(code) ?? code;
	} catch {
		return code;
	}
}

export function holidaysCalendar(country: string, visible: boolean): Calendar {
	return {
		id: 'holidays',
		name: `Holidays in ${countryName(country)}`,
		color: '#dc2626',
		isDefault: false,
		isVisible: visible,
		isSubscribed: true,
		myRights: {
			mayReadFreeBusy: true,
			mayReadItems: true,
			mayWriteAll: false,
			mayWriteOwn: false,
			mayUpdatePrivate: false,
			mayRSVP: false,
			mayShare: false,
			mayDelete: false
		},
		shareWith: null,
		accountId: HOLIDAYS_ACCOUNT
	};
}

/** The years a range touches, its end exclusive. */
export function yearsIn(start: Date, end: Date): number[] {
	const last = new Date(end.getTime() - 1).getFullYear();
	const years: number[] = [];
	for (let year = start.getFullYear(); year <= last; year++) years.push(year);
	return years;
}

/** All-day events, local midnight to the next, kept to those overlapping start–end. */
export function holidayEvents(country: string, list: Holiday[], start: Date, end: Date): CalendarEvent[] {
	return list.flatMap((holiday) => {
		const [year, month, day] = holiday.date.split('-').map(Number) as [number, number, number];
		const from = new Date(year, month - 1, day);
		const to = new Date(year, month - 1, day + 1);
		if (to <= start || from >= end) return [];
		return [
			{
				id: `holiday-${country}-${holiday.date}`,
				accountId: HOLIDAYS_ACCOUNT,
				calendarIds: ['holidays'],
				title: holiday.localName,
				description: holiday.name !== holiday.localName ? holiday.name : undefined,
				start: from,
				end: to,
				allDay: true
			}
		];
	});
}
