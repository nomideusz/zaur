<script lang="ts">
	import { goto } from '$app/navigation';
	import CalendarIcon from '$lib/components/icons/Calendar.svelte';
	import MobileSearchScreen from '$lib/components/shell/MobileSearchScreen.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';

	let query = $state('');

	const matches = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return [];
		return calendar.events
			.filter((event) => `${event.title} ${event.location ?? ''}`.toLowerCase().includes(q))
			.sort((a, b) => a.start.getTime() - b.start.getTime())
			.slice(0, 50);
	});

	const whenFormat = new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});

	function openEvent(id: string) {
		calendar.selectEvent(id);
		void goto('/calendar');
	}
</script>

<svelte:head>
	<title>Search events · ZAUR Webmail</title>
</svelte:head>

<MobileSearchScreen
	bind:value={query}
	placeholder="Search events"
	backHref="/calendar"
	backLabel="Back to calendar"
>
	{#snippet results()}
		{#if query.trim() && matches.length}
			<ul class="divide-y divide-border">
				{#each matches as event (event.id)}
					<li>
						<button
							type="button"
							class="z-list-row flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-sunken/60 active:bg-surface-sunken/80"
							onclick={() => openEvent(event.id)}
						>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold tracking-tight text-fg">{event.title}</p>
								<p class="truncate text-xs text-fg-muted">{whenFormat.format(event.start)}</p>
								{#if event.location}
									<p class="truncate text-[11px] text-fg-subtle">{event.location}</p>
								{/if}
							</div>
							<CalendarIcon class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="flex flex-col items-center gap-3 px-4 py-12 text-center">
				<div class="rounded-full bg-accent/10 p-3 text-accent">
					<CalendarIcon class="size-6" aria-hidden="true" />
				</div>
				<div>
					<p class="text-sm font-semibold text-fg">
						{#if query.trim()}
							No events match your search
						{:else}
							Search your events
						{/if}
					</p>
					<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">
						{#if query.trim()}
							Try a different title or location.
						{:else}
							Find events by title or location.
						{/if}
					</p>
				</div>
			</div>
		{/if}
	{/snippet}
</MobileSearchScreen>
