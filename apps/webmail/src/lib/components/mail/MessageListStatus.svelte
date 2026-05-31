<script lang="ts">
	import AlertCircle from '$lib/components/icons/AlertCircle.svelte';
	import RefreshCw from '$lib/components/icons/RefreshCw.svelte';
	import { frameSvg } from '@zaur/sprite';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';

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
	<div class="flex flex-col items-center gap-3 px-5 py-12 text-center">
		<div class="p-2 text-danger">
			<AlertCircle class="size-10" aria-hidden="true" />
		</div>
		<div>
			<p class="text-sm font-semibold text-fg">Messages could not load</p>
			<p class="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-fg-muted">{error}</p>
		</div>
		{#if onRetry}
			<Button variant="ghost" class="text-sm" onclick={onRetry}>
				<RefreshCw class="size-4" aria-hidden="true" />
				Try again
			</Button>
		{/if}
	</div>
{:else if empty}
	<div class="flex flex-col items-center gap-4 px-6 py-16 text-center">
		{#if emptyIcon !== 'none'}
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
			{#if emptyHint}
				<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">{emptyHint}</p>
			{/if}
		</div>
		{#if emptyActionHref && emptyActionLabel}
			<Button href={emptyActionHref} variant="ghost" class="text-sm">{emptyActionLabel}</Button>
		{:else if mailboxRouteId === 'inbox' || mailboxRouteId === 'drafts'}
			<Button href="/mail/compose" variant="ghost" class="text-sm">New message</Button>
		{/if}
	</div>
{/if}
