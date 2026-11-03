<script lang="ts">
	// svelte-calendar's own widget, the <day-calendar> element, on a sample
	// timetable. Its auto theme probes this page for colours and font, and it
	// takes its phone layout in a column under 768px. It ships its own Svelte,
	// so it loads only when the case comes within half a screen of view.
	// Import reads any calendar app's .ics export into it, Subscribe a feed's
	// address (fetched by static-server.mjs, as Google, Outlook and iCloud send
	// no CORS headers; so not under `vite dev`). A clicked event is booked by the
	// machine around it, whatever calendar it came from; a drag is kept, and
	// Download writes what it shows as an .ics.
	import { parseIcs, toIcs, type TimelineEvent } from '@nomideusz/svelte-calendar';
	import { t } from '#lib/i18n';

	let {
		locale,
		bookedId = '',
		bookedAt = 0,
		onpick,
		onmove
	}: {
		locale: string;
		/** The event in the booking, filled in Signal Orange: by id once one is picked, by its start until then. */
		bookedId?: string;
		bookedAt?: number;
		onpick?: (ev: TimelineEvent) => void;
		onmove?: (ev: TimelineEvent) => void;
	} = $props();
	const isBooked = (x: TimelineEvent) => (bookedId ? x.id === bookedId : +new Date(x.start) === bookedAt);
	let box: HTMLElement;
	let shown = $state<TimelineEvent[]>([]);
	let name = $state('');
	let note = $state('');
	let feed = $state('');
	let busy = $state(false);
	let height = $state(600);
	let events = $derived(shown.length ? JSON.stringify(shown.map((x) => (isBooked(x) ? { ...x, color: '#e75926' } : x))) : '');

	// A yoga studio's week (the names read the same in every language), repeated
	// over the weeks around this one so ‹ › never lands on an empty grid.
	const week: [day: number, h: number, m: number, minutes: number, title: string][] = [
		[0, 7, 0, 60, 'Hatha'],
		[0, 18, 0, 75, 'Vinyasa'],
		[1, 8, 0, 60, 'Pilates'],
		[1, 19, 0, 60, 'Yin'],
		[2, 7, 0, 60, 'Hatha'],
		[2, 17, 30, 90, 'Ashtanga'],
		[3, 12, 0, 60, 'Pilates'],
		[3, 18, 0, 75, 'Vinyasa'],
		[4, 7, 0, 60, 'Hatha'],
		[4, 18, 30, 60, 'Yin'],
		[5, 10, 0, 120, 'Mysore'],
		[6, 10, 0, 90, 'Yoga Nidra']
	];
	const sample = (): TimelineEvent[] => {
		const monday = new Date();
		monday.setHours(0, 0, 0, 0);
		monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
		return [-2, -1, 0, 1, 2, 3].flatMap((w) =>
			week.map(([day, h, m, minutes, title], i) => {
				// Calendar days, not 24h steps, so a DST change keeps the hours.
				const start = new Date(monday);
				start.setDate(start.getDate() + w * 7 + day);
				start.setHours(h, m);
				return { id: `${w}-${i}`, title, start, end: new Date(+start + minutes * 60_000) };
			})
		);
	};

	// The widget takes a fixed list, so recurrences are expanded a year either side.
	function show(text: string, fallback: string) {
		const cal = parseIcs(text);
		const year = 365 * 864e5;
		const found = cal.events({ start: new Date(Date.now() - year), end: new Date(Date.now() + year) });
		if (!found.length) {
			note = t('packages.calendar.empty');
			return;
		}
		shown = found;
		name = cal.name || fallback;
		note = t('packages.calendar.imported', { name });
	}

	async function load(e: Event & { currentTarget: HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (file) show(await file.text(), file.name.replace(/\.[^.]+$/, ''));
	}

	async function subscribe(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			const res = await fetch(`/api/ics?url=${encodeURIComponent(feed)}`);
			if (!res.ok) throw new Error(String(res.status));
			show(await res.text(), new URL(feed.replace(/^webcals?:/i, 'https:')).hostname);
		} catch {
			note = t('packages.calendar.failed');
		} finally {
			busy = false;
		}
	}

	// The widget hands back its own copy of the event; ours keeps description and URL.
	const ours = (ev: TimelineEvent) => shown.find((x) => x.id === ev.id) ?? ev;
	const pick = (e: CustomEvent<{ event: TimelineEvent }>) => onpick?.(ours(e.detail.event));
	function move(e: CustomEvent<{ event: TimelineEvent; start: Date; end: Date }>) {
		const { event, start, end } = e.detail;
		shown = shown.map((x) => (x.id === event.id ? { ...x, start, end } : x));
		onmove?.({ ...ours(event), start, end });
	}

	function save() {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([toIcs(shown, { name: name || 'Yoga' })], { type: 'text/calendar' }));
		a.download = `${name || 'yoga'}.ics`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	$effect(() => {
		const near = new IntersectionObserver(
			([e]) => {
				if (!e.isIntersecting) return;
				near.disconnect();
				if (matchMedia('(max-width: 900px)').matches) height = 440;
				shown = sample();
				import('@nomideusz/svelte-calendar/widget');
			},
			{ rootMargin: '50% 0px' }
		);
		near.observe(box);
		return () => near.disconnect();
	});
</script>

<div class="cal" bind:this={box}>
	{#if events}<day-calendar {events} {locale} view="week-planner" {height} readonly="false" mincolumnwidth="100" oneventclick={pick} oneventmove={move}></day-calendar>{/if}
</div>
<div class="ics">
	<label class="btn">{t('packages.calendar.import')}<input type="file" accept=".ics,.ical,.ifb,text/calendar" onchange={load} /></label>
	<form onsubmit={subscribe}>
		<input type="url" bind:value={feed} required pattern="(https|webcals?)://.+" placeholder="webcal://…" aria-label={t('packages.calendar.feed')} autocomplete="off" spellcheck="false" />
		<button type="submit" class="btn" disabled={busy}>{t('packages.calendar.subscribe')}</button>
	</form>
	<button type="button" class="btn" disabled={!events} onclick={save}>{t('packages.calendar.export')}</button>
	<span aria-live="polite">{note}</span>
</div>

<style>
	/* Holds the widget's height before it loads, so nothing below it moves. */
	.cal {
		min-height: 600px;
	}
	day-calendar {
		display: block;
	}
	@media (max-width: 900px) {
		.cal {
			min-height: 440px;
		}
	}
	.ics {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		padding: 0.6rem 1.39vw;
		border-top: var(--rule) solid var(--ink);
		font-size: 0.875rem;
	}
	/* The page's .p-keys, which is scoped there. */
	.ics form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		max-width: 100%;
	}
	input[type='url'] {
		width: 14rem;
		min-width: 0;
		max-width: 100%;
		padding: 0.1rem 0.4rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
	}
	/* The browser's default grey falls short of 4.5:1 on Paper. */
	input[type='url']::placeholder {
		color: var(--quiet);
		opacity: 1;
	}
	.btn {
		position: relative;
		text-decoration: none;
		padding: 0.1rem 0.5rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--ink);
		color: var(--paper);
		font: inherit;
		cursor: pointer;
	}
	.btn:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.btn:focus-within {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.btn input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}
</style>
