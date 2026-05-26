<script lang="ts">
	import { frameSvg } from '@zaur/sprite';
	import Button from '$lib/components/ui/Button.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
</script>

<div
	class={cn(
		'm-3 hidden min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-lg bg-surface-raised/90 text-center shadow-sm md:flex',
		settings.compactCalendarEmptyEventPanel ? 'p-5' : 'p-8'
	)}
>
	<div class="text-accent">
		{@html frameSvg('cheer', { color: 'currentColor', scale: 2 })}
	</div>
	<h2
		class={cn(
			'font-semibold text-fg',
			settings.compactCalendarEmptyEventPanel ? 'text-base' : 'text-lg'
		)}
	>
		Select an event
	</h2>
	<p
		class={cn(
			'max-w-sm text-fg-muted',
			settings.compactCalendarEmptyEventPanel ? 'text-xs' : 'text-sm'
		)}
	>
		Choose an event from the month grid to view its details here.
	</p>
	{#if !settings.hideCalendarNewEventButton}
		<Button variant="ghost" onclick={() => calendar.openCompose()}>New event</Button>
	{/if}
</div>
