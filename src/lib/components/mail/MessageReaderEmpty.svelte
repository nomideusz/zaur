<script lang="ts">
	import { Mail } from 'lucide-svelte';
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-3 bg-surface p-8 text-center">
	<div class="rounded-full bg-surface-sunken p-4">
		<Mail class="size-8 text-fg-subtle" aria-hidden="true" />
	</div>
	<h2 class="text-lg font-medium text-fg">Select a message</h2>
	<p class="max-w-sm text-sm text-fg-muted">
		Choose a conversation from the list to read it here. External images are blocked by default for your
		privacy.
	</p>
</div>
