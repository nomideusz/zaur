<script lang="ts">
	import { CalendarDays } from 'lucide-svelte';
</script>

<div class="hidden min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-surface-raised p-8 text-center md:flex">
	<div class="rounded-full bg-surface-sunken p-4">
		<CalendarDays class="size-8 text-fg-subtle" aria-hidden="true" />
	</div>
	<h2 class="text-lg font-medium text-fg">Select an event</h2>
	<p class="max-w-sm text-sm text-fg-muted">
		Choose an event from the month grid to view its details here.
	</p>
</div>
