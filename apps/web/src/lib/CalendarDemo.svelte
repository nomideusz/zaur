<script lang="ts">
	// svelte-calendar's own widget, the <day-calendar> element, on a sample
	// timetable. Its auto theme probes this page for colours and font, and it
	// takes its phone layout in a column under 768px. It ships its own Svelte,
	// so it loads only when the case comes within half a screen of view.
	let { locale }: { locale: string } = $props();
	let box: HTMLElement;
	let events = $state('');

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
	const sample = () => {
		const monday = new Date();
		monday.setHours(0, 0, 0, 0);
		monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
		return [-2, -1, 0, 1, 2, 3].flatMap((w) =>
			week.map(([day, h, m, minutes, title], i) => {
				// Calendar days, not 24h steps, so a DST change keeps the hours.
				const start = new Date(monday);
				start.setDate(start.getDate() + w * 7 + day);
				start.setHours(h, m);
				return { id: `${w}-${i}`, title, start: start.toISOString(), end: new Date(+start + minutes * 60_000).toISOString() };
			})
		);
	};

	$effect(() => {
		const near = new IntersectionObserver(
			([e]) => {
				if (!e.isIntersecting) return;
				near.disconnect();
				events = JSON.stringify(sample());
				import('@nomideusz/svelte-calendar/widget');
			},
			{ rootMargin: '50% 0px' }
		);
		near.observe(box);
		return () => near.disconnect();
	});
</script>

<div class="cal" bind:this={box}>
	{#if events}<day-calendar {events} {locale} view="week-planner" height="600" readonly="false" mincolumnwidth="100"></day-calendar>{/if}
</div>

<style>
	/* Holds the widget's height before it loads, so nothing below it moves. */
	.cal {
		min-height: 600px;
	}
	day-calendar {
		display: block;
	}
</style>
