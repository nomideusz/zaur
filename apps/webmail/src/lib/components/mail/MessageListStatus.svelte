<script lang="ts">
	import AlertCircle from '$lib/components/icons/AlertCircle.svelte';
	import RefreshCw from '$lib/components/icons/RefreshCw.svelte';
	import { frameSvg } from '@zaur/sprite';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		loading = false,
		error = null,
		empty = false,
		emptyMessage = 'Nothing here yet',
		emptyHint = null as string | null,
		emptyIcon = 'inbox' as 'inbox' | 'search' | 'none',
		emptyActionHref,
		emptyActionLabel,
		mailboxRouteId,
		onRetry
	}: {
		loading?: boolean;
		error?: string | null;
		empty?: boolean;
		emptyMessage?: string;
		emptyHint?: string | null;
		emptyIcon?: 'inbox' | 'search' | 'none';
		emptyActionHref?: string;
		emptyActionLabel?: string;
		mailboxRouteId?: string;
		onRetry?: () => void;
	} = $props();
</script>

{#if loading}
	<LoadingIndicator label="Loading messages…" />
{:else if error}
	<div
		class={cn(
			'flex flex-col items-center text-center',
			settings.compactListErrorState ? 'gap-2 px-4 py-8' : 'gap-3 px-5 py-12'
		)}
	>
		<div class={cn('text-danger', settings.compactListErrorState ? 'p-1' : 'p-2')}>
			<AlertCircle class={cn(settings.compactListErrorState ? 'size-8' : 'size-10')} aria-hidden="true" />
		</div>
		<div>
			<p class="text-sm font-semibold text-fg">Messages could not load</p>
			<p class="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-fg-muted">{error}</p>
		</div>
		{#if onRetry && !settings.hideListErrorRetry}
			<Button variant="ghost" class="text-sm" onclick={onRetry}>
				<RefreshCw class="size-4" aria-hidden="true" />
				Try again
			</Button>
		{/if}
	</div>
{:else if empty}
	<div
		class={cn(
			'flex flex-col items-center text-center',
			settings.compactListEmptyState ? 'gap-3 px-4 py-10' : 'gap-4 px-6 py-16'
		)}
	>
		{#if emptyIcon !== 'none' && !settings.hideListEmptyHints}
			<div class="text-fg-subtle">
				{#if emptyIcon === 'search'}
					{@html frameSvg('sad', { color: 'currentColor', scale: 2 })}
				{:else}
					{@html frameSvg('sleep', { color: 'currentColor', scale: 2 })}
				{/if}
			</div>
		{/if}
		<div>
			<p class="text-sm font-semibold text-fg">{emptyMessage}</p>
			{#if !settings.hideListEmptyHints && emptyHint}
				<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">{emptyHint}</p>
			{/if}
		</div>
		{#if !settings.hideListEmptyActions}
			{#if emptyActionHref && emptyActionLabel}
				<Button href={emptyActionHref} variant="ghost" class="text-sm">{emptyActionLabel}</Button>
			{:else if mailboxRouteId === 'inbox' || mailboxRouteId === 'drafts'}
				<Button href="/mail/compose" variant="ghost" class="text-sm">New message</Button>
			{/if}
		{/if}
	</div>
{/if}
