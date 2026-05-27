<script lang="ts">
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import DinoWalker from '$lib/components/mail/DinoWalker.svelte';
	import { frameSvg } from '@zaur/sprite';
	import Button from '$lib/components/ui/Button.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		title?: string;
		description?: string;
		showCompose?: boolean;
		showSettings?: boolean;
	}

	let {
		title = 'Select a message',
		description = 'Pick a conversation from the list, or start a new message when you are ready.',
		showCompose = true,
		showSettings = true
	}: Props = $props();

	const showComposeButton = $derived(showCompose && !settings.hideEmptyReaderPrompts && !settings.hideEmptyReaderActions);
	const showSettingsButton = $derived(showSettings && !settings.hideEmptyReaderPrompts && !settings.hideEmptyReaderActions);
	const showPrompts = $derived(!settings.hideEmptyReaderPrompts);
</script>

<div class="z-mail-pane-surface flex min-h-0 flex-1 flex-col overflow-hidden">
	<div
		class={cn(
			'flex min-h-0 flex-1 flex-col items-center justify-center text-center',
			settings.compactEmptyReader ? 'gap-3 p-4' : 'gap-4 p-8'
		)}
	>
		{#if showPrompts}
			{#if !settings.hideEmptyReaderIcon}
				<div class="text-fg-subtle">
					{@html frameSvg('look_up', { color: 'currentColor', scale: 2 })}
				</div>
			{/if}
			<div>
				<h2 class={cn('font-semibold text-fg', settings.compactEmptyReader ? 'text-base' : 'text-lg')}>
					{title}
				</h2>
				{#if !settings.hideEmptyReaderDescription}
					<p
						class={cn(
							'mx-auto mt-2 max-w-sm text-fg-muted',
							settings.compactEmptyReader ? 'text-xs' : 'text-sm'
						)}
					>
						{description}
					</p>
				{/if}
			</div>
		{/if}
		{#if showComposeButton || showSettingsButton}
			<div class="flex flex-wrap items-center justify-center gap-2">
				{#if showComposeButton}
					<Button href="/mail/compose">
						<PenSquare class="size-4" aria-hidden="true" />
						New message
					</Button>
				{/if}
				{#if showSettingsButton}
					<Button href="/settings/appearance" variant="ghost">Settings</Button>
				{/if}
			</div>
		{/if}
	</div>
	<DinoWalker />
</div>
