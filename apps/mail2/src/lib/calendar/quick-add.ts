/**
 * One line to an event: "Lunch with Anna fri 13:00 45m @Długa 5 #work".
 *
 * Read in English and Polish, because that is who writes here: "jutro o 10
 * dentysta", "standup pn-pt 9:00 15m". What is understood is cut out of the
 * line, the filler words left beside it go too, and the rest is the title.
 * Nothing is guessed silently: the caller shows the reading before it is
 * saved, so a wrong hour is seen and fixed rather than stored.
 */
import type { EventRecurrence } from '@zaur/mail-core';

type Weekday = 'mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su';

export interface QuickAdd {
	title: string;
	start: Date;
	end: Date;
	allDay: boolean;
	location: string;
	/** The `#word`, for the caller to match against its calendars. */
	calendar: string | null;
	recurrence: EventRecurrence | null;
	/** Whether a day or a time was read at all, or the defaults stand. */
	dated: boolean;
	timed: boolean;
}

const WEEKDAYS: Weekday[] = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];

/** Folded (no diacritics, lower case) word → weekday. */
const DAY_WORDS: [RegExp, Weekday][] = [
	[/mon(day)?|pon(iedzialek|iedzialki)?|pn/, 'mo'],
	[/tue(s|sday)?|wt(orek|orki)?/, 'tu'],
	[/wed(nesday)?|sr(oda|ode|ody)?/, 'we'],
	[/thu(r|rs|rsday)?|czw(artek|artki)?/, 'th'],
	[/fri(day)?|pt|piat(ek|ki)?/, 'fr'],
	[/sat(urday)?|sob(ota|ote|oty)?/, 'sa'],
	[/sun(day)?|nd|niedz(iela|iele|ieli)?/, 'su']
];
/** As alternatives inside a bigger pattern, their own groups made non-capturing so its group numbers hold. */
const alternatives = (words: RegExp[]) => words.map((word) => word.source.replace(/\((?!\?)/g, '(?:')).join('|');
const DAY_ALT = alternatives(DAY_WORDS.map(([word]) => word));

const MONTH_WORDS: RegExp[] = [
	/jan(uary)?|sty(cznia|czen)?/,
	/feb(ruary)?|lut(ego|y)?/,
	/mar(ch|ca|zec)?/,
	/apr(il)?|kwi(etnia|ecien)?/,
	/may|maj(a)?/,
	/jun(e)?|cze(rwca|rwiec)?/,
	/jul(y)?|lip(ca|iec)?/,
	/aug(ust)?|sie(rpnia|rpien)?/,
	/sep(t|tember)?|wrz(esnia|esien)?/,
	/oct(ober)?|paz(dziernika|dziernik)?/,
	/nov(ember)?|lis(topada|topad)?/,
	/dec(ember)?|gru(dnia|dzien)?/
];
const MONTH_ALT = alternatives(MONTH_WORDS);

const monthOf = (word: string) => MONTH_WORDS.findIndex((re) => new RegExp(`^(${re.source})$`).test(word));
const weekdayOf = (word: string) => DAY_WORDS.find(([re]) => new RegExp(`^(${re.source})$`).test(word))?.[1] ?? null;

/** Same length as its input, so an index found in the folded text cuts the original. */
export function fold(text: string): string {
	const map: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
	let out = '';
	for (const char of text.toLowerCase()) out += map[char] ?? (char.length === 1 ? char.normalize('NFD')[0]! : char);
	return out.length === text.length ? out : text.toLowerCase();
}

const B = '(?<![\\p{L}\\d])'; // word start, Unicode-aware
const E = '(?![\\p{L}\\d])'; // word end

interface Cut {
	from: number;
	to: number;
}

export function parseQuickAdd(input: string, now: Date = new Date()): QuickAdd | null {
	const text = input.replace(/\s+/g, ' ').trim();
	if (!text) return null;
	const folded = fold(text);
	const cuts: Cut[] = [];
	/** The first match of `pattern` not inside an earlier cut, cut out. */
	const take = (pattern: string): RegExpExecArray | null => {
		const re = new RegExp(pattern, 'giu');
		for (let match = re.exec(folded); match; match = re.exec(folded)) {
			const from = match.index;
			const to = from + match[0].length;
			if (cuts.some((cut) => from < cut.to && to > cut.from)) continue;
			cuts.push({ from, to });
			return match;
		}
		return null;
	};

	// The calendar, anywhere; then whatever follows "@" is a place, not a date.
	let calendar: string | null = null;
	const tag = take(`(?:^|\\s)#([\\p{L}\\d_-]+)`);
	if (tag) calendar = text.slice(tag.index, tag.index + tag[0].length).trim().slice(1);
	let location = '';
	const at = /(^|\s)@\s*/u.exec(text);
	let locationFrom = text.length;
	if (at) {
		locationFrom = at.index;
		cuts.push({ from: at.index, to: text.length });
	}

	// Repeats.
	let recurrence: EventRecurrence | null = null;
	let repeatDay: Weekday | null = null;
	const weekdays = take(`${B}(?:weekdays|workdays|mon-fri|mon\\s*[-–]\\s*fri|pn\\s*[-–]\\s*pt|pon\\s*[-–]\\s*pt|w dni robocze|dni robocze)${E}`);
	if (weekdays) recurrence = { frequency: 'weekly', interval: 1, byDay: ['mo', 'tu', 'we', 'th', 'fr'] };
	if (!recurrence) {
		const everyDay = take(`${B}(?:every\\s+(${DAY_ALT})s?|(?:w\\s+)?(?:kazd[aye]|co)\\s+(${DAY_ALT}))${E}`);
		if (everyDay) {
			repeatDay = weekdayOf(everyDay[1] ?? everyDay[2] ?? '');
			if (repeatDay) recurrence = { frequency: 'weekly', interval: 1, byDay: [repeatDay] };
		}
	}
	if (!recurrence) {
		const every = take(`${B}(?:every\\s+(day|week|month|year)|(daily|weekly|monthly|yearly|annually)|codziennie|co\\s*(?:dzien|dziennie)|co\\s+(tydzien|tygodnie|miesiac|rok|roku))${E}`);
		if (every) {
			const word = every[1] ?? every[2] ?? every[3] ?? 'day';
			const frequency =
				/^(week|weekly|tydzien|tygodnie)$/.test(word) ? 'weekly'
				: /^(month|monthly|miesiac)$/.test(word) ? 'monthly'
				: /^(year|yearly|annually|rok|roku)$/.test(word) ? 'yearly'
				: 'daily';
			recurrence = { frequency, interval: 1, byDay: [] };
		}
	}

	// All day, said outright.
	const allDayWord = take(`${B}(?:all[ -]day|caly dzien|calodniowe?)${E}`);

	// Duration: "45m", "1h30", "1.5h", "90 min", "2 godz", "for 1 h".
	let minutes: number | null = null;
	const duration = take(
		`${B}(?:for\\s+|na\\s+)?(\\d+(?:[.,]\\d+)?)\\s*(h|hr|hrs|hours?|godz(?:in[ay]?)?)(?:\\s*(\\d{1,2})\\s*(?:m|min|mins|minut[ay]?)?)?${E}|${B}(?:for\\s+|na\\s+)?(\\d{1,3})\\s*(?:m|min|mins|minutes?|minut[ay]?)${E}`
	);
	if (duration) {
		if (duration[1]) minutes = Math.round(parseFloat(duration[1].replace(',', '.')) * 60) + (duration[3] ? parseInt(duration[3], 10) : 0);
		else if (duration[4]) minutes = parseInt(duration[4], 10);
		if (minutes !== null && (minutes <= 0 || minutes > 14 * 24 * 60)) minutes = null;
	}

	// Times: a range first, then a single time.
	const T = `(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|a|p)?`;
	let startMin: number | null = null;
	let endMin: number | null = null;
	const range = take(`${B}(?:from\\s+|od\\s+|at\\s+|o\\s+|godz\\.?\\s+)?${T}\\s*(?:-|–|—|to|do|until|till)\\s*${T}${E}`);
	if (range) {
		const b = clock(range[4]!, range[5], range[6]);
		// "10-2pm" is ten in the morning: the second half's pm only carries over when it fits.
		let a = clock(range[1]!, range[2], range[3] ?? range[6]);
		if (!range[3] && range[6] && a !== null && b !== null && a > b) a = clock(range[1]!, range[2], 'am');
		if (a !== null && b !== null) {
			startMin = a;
			endMin = b <= a ? b + 24 * 60 : b;
		} else cuts.pop();
	}
	if (startMin === null) {
		const single =
			take(`${B}(?:at\\s+|o\\s+|godz\\.?\\s+)?(\\d{1,2})[:](\\d{2})\\s*(am|pm|a|p)?${E}`) ??
			take(`${B}(?:at\\s+|o\\s+|godz\\.?\\s+)?(\\d{1,2})\\s*(am|pm|a|p)${E}`) ??
			take(`${B}(?:at|o|godz\\.?)\\s+(\\d{1,2})(?:[.](\\d{2}))?${E}`);
		if (single) {
			const [hour, maybeMinutes, maybeMeridiem] = [single[1]!, single[2], single[3]];
			// The middle group is minutes in two of the patterns and am/pm in the other.
			const meridiem = maybeMinutes && /^[ap]/.test(maybeMinutes) ? maybeMinutes : maybeMeridiem;
			const mins = maybeMinutes && /^\d/.test(maybeMinutes) ? maybeMinutes : undefined;
			startMin = clock(hour, mins, meridiem);
			if (startMin === null) cuts.pop();
		}
	}
	if (startMin === null) {
		const named = take(`${B}(noon|midday|poludnie|w poludnie|midnight|polnoc|o polnocy)${E}`);
		if (named) startMin = /noon|midday|poludnie/.test(named[1]!) ? 12 * 60 : 0;
	}

	// The day.
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	let day: Date | null = null;
	let strictlyLater = false;
	let weekdayNamed = false;
	const relative = take(`${B}(today|tonight|dzis|dzisiaj|tomorrow|tmrw|jutro|day after tomorrow|pojutrze)${E}`);
	if (relative) {
		const word = relative[1]!;
		day = addDays(today, /tomorrow|tmrw|jutro/.test(word) && !/after/.test(word) ? 1 : /after|pojutrze/.test(word) ? 2 : 0);
		if (word === 'tonight' && startMin === null) startMin = 19 * 60;
	}
	if (!day) {
		const inDays = take(`${B}(?:in|za)\\s+(\\d{1,3})\\s*(days?|dni|dzien|weeks?|tygodni[ae]?|tydzien)${E}`);
		if (inDays) day = addDays(today, parseInt(inDays[1]!, 10) * (/^(w|t)/.test(inDays[2]!) ? 7 : 1));
	}
	if (!day) {
		const iso = take(`${B}(\\d{4})-(\\d{1,2})-(\\d{1,2})${E}`);
		if (iso) day = validDate(+iso[1]!, +iso[2]! - 1, +iso[3]!);
	}
	if (!day) {
		// 27.10, 27/10, 27.10.2026 — day first, as written in Poland and Britain.
		const numeric = take(`${B}(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{2,4}))?${E}`);
		if (numeric) {
			const year = numeric[3] ? (numeric[3].length === 2 ? 2000 + +numeric[3] : +numeric[3]) : null;
			day = validDate(year ?? today.getFullYear(), +numeric[2]! - 1, +numeric[1]!);
			if (day && year === null && day < today) day = validDate(today.getFullYear() + 1, +numeric[2]! - 1, +numeric[1]!);
			if (!day) cuts.pop();
		}
	}
	if (!day) {
		const named =
			take(`${B}(?:on\\s+|the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_ALT})\\.?(?:\\s+(\\d{4}))?${E}`) ??
			take(`${B}(?:on\\s+)?(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?${E}`);
		if (named) {
			const [dayText, monthText] = /^\d/.test(named[1]!) ? [named[1]!, named[2]!] : [named[2]!, named[1]!];
			const month = monthOf(monthText);
			const year = named[3] ? +named[3] : null;
			day = month < 0 ? null : validDate(year ?? today.getFullYear(), month, +dayText);
			if (day && year === null && day < today) day = validDate(today.getFullYear() + 1, month, +dayText);
		}
	}
	if (!day) {
		const weekday = take(`${B}(?:(next|this|on|w|we|ten|ta|przyszl[aye]|nastepn[aye])\\s+)?(${DAY_ALT})\\.?${E}`);
		if (weekday) {
			const target = weekdayOf(weekday[2]!);
			if (target) {
				strictlyLater = Boolean(weekday[1] && /next|przyszl|nastepn/.test(weekday[1]));
				weekdayNamed = true;
				day = nextWeekday(today, target, strictlyLater);
			}
		}
	}
	if (!day && repeatDay) day = nextWeekday(today, repeatDay, false);
	if (!day && recurrence?.byDay.length === 5) day = nextWeekday(today, today.getDay() === 0 || today.getDay() === 6 ? 'mo' : WEEKDAYS[today.getDay()]!, false);

	// "Tue 9:00" said on a Tuesday afternoon is next Tuesday.
	if (day && weekdayNamed && sameDay(day, today) && startMin !== null && startMin < minutesInto(now)) day = addDays(day, 7);

	// The title is what is left, without the small words that pointed at what was cut.
	const kept = cutOut(text, cuts, locationFrom);
	if (at) {
		const after = at.index + at[0].length;
		location = tag && tag.index >= after ? text.slice(after, tag.index) + text.slice(tag.index + tag[0].length) : text.slice(after);
		location = location.replace(/\s+/g, ' ').trim();
	}
	const title = kept
		.replace(/(?:^|\s)(?:at|on|o|w|we|for|na|from|od|do|until|till|in|za|the)(?=\s*(?:⟂|$))/giu, ' ')
		.replace(/⟂/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, '')
		.trim();

	const dated = day !== null;
	const timed = startMin !== null;
	const allDay = Boolean(allDayWord) || (dated && !timed && minutes === null);
	let start: Date;
	let end: Date;
	if (allDay) {
		start = day ?? today;
		end = addDays(start, 1);
	} else {
		const base = day ?? today;
		if (startMin === null) {
			// No time: the next whole hour, today or on the day named.
			const nextHour = sameDay(base, today) ? Math.min(23, now.getHours() + 1) : 9;
			startMin = nextHour * 60;
		}
		start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, startMin);
		const length = endMin !== null ? endMin - (startMin ?? 0) : (minutes ?? 60);
		end = new Date(start.getTime() + length * 60_000);
	}
	return { title, start, end, allDay, location, calendar, recurrence, dated, timed };
}

/** Hour and minutes (with am/pm) to minutes into the day, or null if not a time. */
function clock(hourText: string, minuteText: string | undefined, meridiem: string | undefined): number | null {
	let hour = parseInt(hourText, 10);
	const minute = minuteText ? parseInt(minuteText, 10) : 0;
	if (minute > 59) return null;
	if (meridiem) {
		if (hour < 1 || hour > 12) return null;
		const pm = meridiem.startsWith('p');
		hour = (hour % 12) + (pm ? 12 : 0);
	}
	if (hour > 24 || (hour === 24 && minute > 0)) return null;
	return hour * 60 + minute;
}

function cutOut(text: string, cuts: Cut[], until: number): string {
	let out = '';
	let at = 0;
	for (const cut of [...cuts].sort((a, b) => a.from - b.from)) {
		if (cut.from < at) continue;
		out += text.slice(at, Math.min(cut.from, until)) + (cut.from < until ? '⟂' : '');
		at = cut.to;
	}
	if (at < until) out += text.slice(at, until);
	return out;
}

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const minutesInto = (date: Date) => date.getHours() * 60 + date.getMinutes();

function validDate(year: number, month: number, day: number): Date | null {
	const date = new Date(year, month, day);
	return date.getMonth() === month && date.getDate() === day ? date : null;
}

function nextWeekday(from: Date, target: Weekday, strictlyLater: boolean): Date {
	const delta = (WEEKDAYS.indexOf(target) - from.getDay() + 7) % 7;
	return addDays(from, delta === 0 && strictlyLater ? 7 : delta);
}
