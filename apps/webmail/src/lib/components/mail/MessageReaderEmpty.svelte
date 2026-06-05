<script lang="ts">
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import { frameSvg } from '@zaur/sprite';
	import Button from '$lib/components/ui/Button.svelte';
	import { mail } from '$lib/stores/mail.svelte';

	interface Props {
		title?: string;
		description?: string;
		showCompose?: boolean;
		showSettings?: boolean;
		hideTitle?: boolean;
	}

	let {
		title = 'Select a message',
		description = 'Pick a conversation from the list, or start a new message when you are ready.',
		showCompose = true,
		showSettings = true,
		hideTitle = false
	}: Props = $props();

	const showZaur = $derived(mail.messages.length > 0);
</script>

<div class="z-mail-pane-surface flex min-h-0 flex-1 flex-col overflow-hidden">
	<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
		{#if showZaur}
			<div class="text-fg-subtle">
				{@html frameSvg('look_up', { color: 'currentColor', scale: 2 })}
			</div>
		{/if}
		<div>
			{#if !hideTitle}
				<p class="m-0 text-lg font-semibold text-fg">
					{title}
				</p>
			{/if}
			<p class="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
				{description}
			</p>
		</div>
		{#if showCompose || showSettings}
			<div class="flex flex-wrap items-center justify-center gap-2">
				{#if showCompose}
					<Button href="/mail/compose">
						<PenSquare class="size-4" aria-hidden="true" />
						New message
					</Button>
				{/if}
				{#if showSettings}
					<Button href="/settings/appearance" variant="ghost">Settings</Button>
				{/if}
			</div>
		{/if}
	</div>
</div>
