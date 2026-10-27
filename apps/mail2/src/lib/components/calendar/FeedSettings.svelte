<script lang="ts">
	import { ask } from '#lib/confirm.svelte.ts';
	import { untrack } from 'svelte';
	import { CALENDAR_COLORS } from '@zaur/mail-core';
	import { prefs, setPref } from '#lib/settings.svelte.ts';
	import type { CalendarFeed } from '#lib/settings';

	/** A subscribed calendar's settings: what it is called here, its colour, its link, and unsubscribing. */
	let {
		feed,
		onDone,
		onClose
	}: {
		feed: CalendarFeed;
		/** `closed` when it was unsubscribed. */
		onDone: (message: string, closed?: boolean) => void;
		onClose: () => void;
	} = $props();

	let name = $state('');
	let color = $state('');
	$effect(() => {
		feed.id;
		untrack(() => {
			name = feed.name;
			color = feed.color;
		});
	});

	const changed = $derived(name.trim() !== feed.name || color !== feed.color);
	export function isDirty(): boolean {
		return changed;
	}
	const swatches = $derived(CALENDAR_COLORS.includes(feed.color) ? CALENDAR_COLORS : [feed.color, ...CALENDAR_COLORS]);
	const label = 'block text-[12px] text-[var(--z-soft)]';

	function save(submitted: SubmitEvent) {
		submitted.preventDefault();
		if (!changed || !name.trim()) return;
		setPref(
			'calendarFeeds',
			prefs.calendarFeeds.map((f) => (f.id === feed.id ? { ...f, name: name.trim(), color } : f))
		);
		onDone('Calendar saved');
	}

	async function remove() {
		if (!(await ask({ title: `Unsubscribe from “${feed.name}”?`, body: 'Its events leave this calendar. The calendar itself is not touched.', action: 'Unsubscribe' }))) return;
		setPref('calendarFeeds', prefs.calendarFeeds.filter((f) => f.id !== feed.id));
		onDone(`Unsubscribed from “${feed.name}”`, true);
	}
</script>

<div class="flex h-full flex-col">
	<div class="flex items-center justify-between gap-3 border-b border-[var(--z-hairline)] px-6 py-3 max-md:px-4">
		<h2 class="min-w-0 truncate text-[14px] font-semibold text-[var(--z-ink)]">{feed.name}</h2>
		<button type="button" class="btn-tactile !h-[30px] shrink-0" onclick={onClose}>Done</button>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
		<div class="mx-auto flex max-w-[560px] flex-col gap-6">
			<p class="rounded-[8px] border border-[var(--z-hairline)] bg-[var(--z-hover)] px-3 py-2 text-[12.5px] text-[var(--z-muted)]">
				Subscribed by link. Read-only here; it refreshes every few minutes.
			</p>

			<form class="flex flex-col gap-4" onsubmit={save}>
				<label>
					<span class={label}>Name</span>
					<input class="z-field mt-1 w-full max-md:text-base" bind:value={name} required maxlength="200" autocomplete="off" />
				</label>
				<fieldset>
					<legend class={label}>Colour</legend>
					<div class="mt-1.5 flex flex-wrap gap-2">
						{#each swatches as swatch (swatch)}
							<button
								type="button"
								class="size-[26px] rounded-full border-2 transition-transform hover:scale-110 {color === swatch
									? 'border-[var(--z-ink)]'
									: 'border-transparent'}"
								style:background={swatch}
								aria-label="Colour {swatch}"
								aria-pressed={color === swatch}
								onclick={() => (color = swatch)}
							></button>
						{/each}
					</div>
				</fieldset>
				<div>
					<button type="submit" class="btn-tactile btn-primary !h-[30px]" disabled={!changed || !name.trim()}>Save</button>
				</div>
			</form>

			<section>
				<h3 class="z-caption mb-1.5">Link</h3>
				<p class="break-all font-mono text-[12px] text-[var(--z-muted)]">{feed.url}</p>
			</section>

			<section>
				<h3 class="z-caption mb-1.5">Unsubscribe</h3>
				<button type="button" class="btn-tactile !h-[30px] text-[var(--z-ch-discard-ink)]" onclick={remove}>Unsubscribe</button>
			</section>
		</div>
	</div>
</div>
