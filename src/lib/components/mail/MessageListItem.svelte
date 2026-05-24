<script lang="ts">
	import { Paperclip, Star } from 'lucide-svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
	import type { MessagePreview } from '$lib/types/mail';

	interface Props {
		message: MessagePreview;
		active?: boolean;
		href: string;
		selectionMode?: boolean;
		selected?: boolean;
		onToggleSelect?: () => void;
	}

	let {
		message,
		active = false,
		href,
		selectionMode = false,
		selected = false,
		onToggleSelect
	}: Props = $props();

	const when = $derived(
		new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
			new Date(message.receivedAt)
		)
	);

	const rowClass = $derived(
		cn(
			'z-list-row flex border-b border-border transition-colors',
			selectionMode ? 'cursor-pointer items-start gap-3 px-3 py-3' : 'flex-col justify-center px-4',
			active || selected ? 'bg-surface-sunken' : 'hover:bg-surface-sunken/70',
			message.unread && !selectionMode && 'border-l-2 border-l-unread pl-[calc(1rem-2px)]',
			message.unread && selectionMode && 'border-l-2 border-l-unread'
		)
	);
</script>

{#if selectionMode}
	<div
		class={rowClass}
		role="button"
		tabindex="0"
		onclick={onToggleSelect}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onToggleSelect?.();
			}
		}}
	>
		<input
			type="checkbox"
			class="mt-0.5 size-4 shrink-0 accent-accent"
			checked={selected}
			onclick={(e) => e.stopPropagation()}
			onchange={onToggleSelect}
			aria-label="Select {message.subject}"
		/>
		<div class="min-w-0 flex-1">
			<div class="flex items-baseline justify-between gap-2">
				<span class={cn('truncate text-sm', message.unread ? 'font-semibold text-fg' : 'text-fg')}>
					{message.from.name}
				</span>
				<span class="shrink-0 text-xs text-fg-subtle">{when}</span>
			</div>
			<div class="flex items-center gap-1.5">
				{#if message.starred}
					<Star class="size-3.5 shrink-0 fill-star text-star" aria-label="Starred" />
				{/if}
				<span
					class={cn('truncate text-sm', message.unread ? 'font-medium text-fg' : 'text-fg-muted')}
				>
					{message.subject}
				</span>
				{#if message.hasAttachment}
					<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-label="Has attachment" />
				{/if}
			</div>
			{#if settings.listDensity !== 'compact'}
				<p class="truncate text-xs text-fg-subtle">{message.preview}</p>
			{/if}
		</div>
	</div>
{:else}
	<a {href} class={rowClass} style="view-transition-name: message-{message.id};">
		<div class="flex items-baseline justify-between gap-2">
			<span class={cn('truncate text-sm', message.unread ? 'font-semibold text-fg' : 'text-fg')}>
				{message.from.name}
			</span>
			<span class="shrink-0 text-xs text-fg-subtle">{when}</span>
		</div>
		<div class="flex items-center gap-1.5">
			{#if message.starred}
				<Star class="size-3.5 shrink-0 fill-star text-star" aria-label="Starred" />
			{/if}
			<span class={cn('truncate text-sm', message.unread ? 'font-medium text-fg' : 'text-fg-muted')}>
				{message.subject}
			</span>
			{#if message.hasAttachment}
				<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-label="Has attachment" />
			{/if}
		</div>
		{#if settings.listDensity !== 'compact'}
			<p class="truncate text-xs text-fg-subtle">{message.preview}</p>
		{/if}
	</a>
{/if}
