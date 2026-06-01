<script lang="ts">
	import { frameSvg } from '@zaur/sprite';
	import Button from '$lib/components/ui/Button.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
</script>

<div class="z-mail-pane-surface hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex">
	<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
		<div class="text-accent">
			{@html frameSvg('cheer', { color: 'currentColor', scale: 2 })}
		</div>
		<h2 class="text-lg font-semibold text-fg">
			Select an event
		</h2>
		<p class="max-w-sm text-sm text-fg-muted">
			Choose an event from the month grid to view its details here.
		</p>
		<Button variant="ghost" onclick={() => calendar.openCompose()}>New event</Button>
	</div>
</div>
