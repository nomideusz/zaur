<script lang="ts">
	import { frameSvg } from '@zaur/sprite';
	import Button from '$lib/components/ui/Button.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
</script>

<div
	class={cn(
		'm-3 hidden min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-lg bg-surface-raised/90 text-center shadow-sm md:flex',
		settings.compactContactsEmptyState ? 'p-5' : 'p-8'
	)}
>
	<div class="text-accent">
		{@html frameSvg('happy', { color: 'currentColor', scale: 2 })}
	</div>
	<h2
		class={cn(
			'font-semibold text-fg',
			settings.compactContactsEmptyState ? 'text-base' : 'text-lg'
		)}
	>
		Select a contact
	</h2>
	<p
		class={cn(
			'max-w-sm text-fg-muted',
			settings.compactContactsEmptyState ? 'text-xs' : 'text-sm'
		)}
	>
		Choose someone from the list to view their details and start a message.
	</p>
	<Button href="/mail/compose" variant="ghost">New message</Button>
</div>
