<script lang="ts">
	import { frameSvg } from '@zaur/sprite';
	import { mail } from '$lib/stores/mail.svelte';

	const showZaur = $derived(mail.messages.length > 0);
</script>

<div class="z-mail-pane-surface flex min-h-0 flex-1 flex-col overflow-hidden">
	<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
		{#if showZaur}
			<div class="text-fg-subtle">
				{@html frameSvg('look_up', { color: 'currentColor', scale: 2 })}
			</div>
		{/if}
	</div>
</div>
