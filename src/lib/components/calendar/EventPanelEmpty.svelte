<script lang="ts">
	import { CalendarDays } from 'lucide-svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
</script>

<div
	class={cn(
		'hidden min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden bg-surface-raised text-center md:flex',
		settings.compactCalendarEmptyEventPanel ? 'p-5' : 'p-8'
	)}
>
	<div
		class={cn(
			'rounded-full bg-surface-sunken',
			settings.compactCalendarEmptyEventPanel ? 'p-3' : 'p-4'
		)}
	>
		<CalendarDays
			class={cn('text-fg-subtle', settings.compactCalendarEmptyEventPanel ? 'size-6' : 'size-8')}
			aria-hidden="true"
		/>
	</div>
	<h2
		class={cn(
			'font-medium text-fg',
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
</div>
