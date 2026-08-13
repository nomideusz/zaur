import type { Calendar, CalendarRights, CalendarShareRole } from '../types/calendar';
import type { JMAPCalendarRights } from './calendar-types';

export const CALENDAR_COLORS = [
	'#2563eb',
	'#7c3aed',
	'#db2777',
	'#ea580c',
	'#16a34a',
	'#0891b2',
	'#ca8a04',
	'#dc2626',
	'#4f46e5',
	'#0d9488'
];

const FULL_RIGHTS: CalendarRights = {
	mayReadFreeBusy: true,
	mayReadItems: true,
	mayWriteAll: true,
	mayWriteOwn: true,
	mayUpdatePrivate: true,
	mayRSVP: true,
	mayShare: true,
	mayDelete: true
};

const NONE_RIGHTS: CalendarRights = {
	mayReadFreeBusy: false,
	mayReadItems: false,
	mayWriteAll: false,
	mayWriteOwn: false,
	mayUpdatePrivate: false,
	mayRSVP: false,
	mayShare: false,
	mayDelete: false
};

/** Missing `myRights` (older servers) is treated as full owner access. */
export function normalizeCalendarRights(
	rights?: JMAPCalendarRights | CalendarRights | null
): CalendarRights {
	if (!rights) return { ...FULL_RIGHTS };

	return {
		mayReadFreeBusy: rights.mayReadFreeBusy ?? false,
		mayReadItems: rights.mayReadItems ?? false,
		mayWriteAll: rights.mayWriteAll ?? false,
		mayWriteOwn: rights.mayWriteOwn ?? false,
		mayUpdatePrivate: rights.mayUpdatePrivate ?? false,
		mayRSVP: rights.mayRSVP ?? false,
		mayShare: rights.mayShare ?? false,
		mayDelete: rights.mayDelete ?? false
	};
}

export function rightsForShareRole(role: CalendarShareRole): CalendarRights {
	if (role === 'write') {
		return {
			...NONE_RIGHTS,
			mayReadFreeBusy: true,
			mayReadItems: true,
			mayWriteAll: true,
			mayWriteOwn: true,
			mayUpdatePrivate: true,
			mayRSVP: true
		};
	}

	return {
		...NONE_RIGHTS,
		mayReadFreeBusy: true,
		mayReadItems: true
	};
}

export function shareRoleFromRights(rights: CalendarRights | JMAPCalendarRights): CalendarShareRole {
	return rights.mayWriteAll || rights.mayWriteOwn ? 'write' : 'read';
}

export function calendarAllowsWrites(calendar: Pick<Calendar, 'myRights'>): boolean {
	return calendar.myRights.mayWriteAll || calendar.myRights.mayWriteOwn;
}

export function calendarAllowsShare(calendar: Pick<Calendar, 'myRights'>): boolean {
	return calendar.myRights.mayShare;
}

export function isOwnedCalendar(calendar: Pick<Calendar, 'isDefault' | 'myRights'>): boolean {
	return calendar.isDefault || calendar.myRights.mayShare || calendar.myRights.mayDelete;
}

export function calendarDeleteBlockedReason(
	calendar: Pick<Calendar, 'isDefault' | 'myRights' | 'name'>,
	calendars: Array<Pick<Calendar, 'myRights'>>
): string | null {
	if (!calendar.myRights.mayDelete) {
		return 'You don’t have permission to delete this calendar.';
	}
	if (calendar.isDefault) {
		return 'Set another calendar as default before deleting this one.';
	}
	if (calendars.length <= 1) {
		return 'Keep at least one calendar.';
	}
	return null;
}

/** Spec: show an event if any of its calendars is visible. */
export function eventIsVisibleOnCalendars(
	calendarIds: string[],
	hiddenCalendarIds: ReadonlySet<string>
): boolean {
	if (!hiddenCalendarIds.size) return true;
	if (!calendarIds.length) return true;
	return calendarIds.some((id) => !hiddenCalendarIds.has(id));
}

export function nextCalendarColor(existingColors: string[]): string {
	const used = new Set(existingColors.map((color) => color.toLowerCase()));
	return CALENDAR_COLORS.find((color) => !used.has(color.toLowerCase())) ?? CALENDAR_COLORS[0];
}

/** JMAP map patch: `null` removes a principal. */
export function patchShareWith(
	current: Record<string, CalendarRights> | null,
	principalId: string,
	rights: CalendarRights | null
): Record<string, CalendarRights | null> {
	const next: Record<string, CalendarRights | null> = { ...(current ?? {}) };
	next[principalId] = rights;
	return next;
}
