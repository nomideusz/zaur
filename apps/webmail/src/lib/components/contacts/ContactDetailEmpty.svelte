<script lang="ts">
	import DinoZaur from '$lib/components/mail/DinoZaur.svelte';
	import { frameSvg } from '@zaur/sprite';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<div class="z-mail-pane-surface hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex">
	<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
		<div class="text-accent">
			{@html frameSvg('happy', { color: 'currentColor', scale: 2 })}
		</div>
		<h2 class="text-lg font-semibold text-fg">
			Select a contact
		</h2>
		<p class="max-w-sm text-sm text-fg-muted">
			Choose someone from the list to view their details and start a message.
		</p>
		<Button href="/mail/compose" variant="ghost">New message</Button>
	</div>
	<DinoZaur />
</div>
