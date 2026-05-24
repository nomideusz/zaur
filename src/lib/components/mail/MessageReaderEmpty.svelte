<script lang="ts">
	import { PenSquare, Mail } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-4 bg-surface-raised p-8 text-center">
	<div class="rounded-full bg-surface-sunken p-4">
		<Mail class="size-8 text-fg-subtle" aria-hidden="true" />
	</div>
	<div>
		<h2 class="text-lg font-medium text-fg">Select a message</h2>
		<p class="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
			Choose a conversation from the list to read it here, or start writing something new.
		</p>
	</div>
	<div class="flex flex-wrap items-center justify-center gap-2">
		<Button href="/mail/compose">
			<PenSquare class="size-4" aria-hidden="true" />
			Compose
		</Button>
		<Button href="/settings/display" variant="ghost">Display settings</Button>
	</div>
</div>
