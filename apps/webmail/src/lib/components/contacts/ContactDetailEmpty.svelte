<script lang="ts">
	import { frameSvg } from '@zaur/sprite';
	import Button from '$lib/components/ui/Button.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
</script>

<div class="z-mail-pane-surface hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex">
	<div
		class={cn(
			'flex min-h-0 flex-1 flex-col items-center justify-center text-center',
			settings.compactContactsEmptyState ? 'gap-3 p-5' : 'gap-4 p-8'
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
</div>
