<script lang="ts">
	import { Users } from 'lucide-svelte';
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
	<div
		class={cn(
			'rounded-full bg-accent/10 text-accent',
			settings.compactContactsEmptyState ? 'p-3' : 'p-4'
		)}
	>
		<Users
			class={cn(settings.compactContactsEmptyState ? 'size-6' : 'size-8')}
			aria-hidden="true"
		/>
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
