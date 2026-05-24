<script lang="ts">
	import { Paperclip, Star } from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { formatMessageListWhen } from '$lib/utils/dates';
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

	const when = $derived(formatMessageListWhen(message.receivedAt));

	const rowClass = $derived(
		cn(
			'z-list-row flex items-start gap-3 border-b border-border px-3 py-2.5 transition-colors',
			selectionMode ? 'cursor-pointer' : '',
			active || selected ? 'bg-surface-sunken' : 'hover:bg-surface-sunken/70'
		)
	);
</script>

{#snippet avatar()}
	<div class="relative shrink-0">
		<Avatar name={message.from.name} email={message.from.email} class="mt-0.5 size-8" />
		{#if message.unread}
			<span
				class="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-unread ring-2 ring-surface-raised"
				aria-label="Unread"
			></span>
		{/if}
	</div>
{/snippet}

{#snippet content()}
	{@render avatar()}
	<div class="min-w-0 flex-1">
		<div class="flex items-baseline justify-between gap-2">
			<span class={cn('truncate text-sm', message.unread ? 'font-semibold text-fg' : 'text-fg')}>
				{message.from.name}
			</span>
			<span class="shrink-0 text-xs text-fg-subtle">{when}</span>
		</div>
		<div class="mt-0.5 flex items-center gap-1.5">
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
		{#if settings.showListPreview && message.preview}
			<p class="mt-0.5 truncate text-xs text-fg-subtle">{message.preview}</p>
		{/if}
	</div>
{/snippet}

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
			class="mt-2 size-4 shrink-0 accent-accent"
			checked={selected}
			onclick={(e) => e.stopPropagation()}
			onchange={onToggleSelect}
			aria-label="Select {message.subject}"
		/>
		{@render content()}
	</div>
{:else}
	<a {href} class={rowClass} style="view-transition-name: message-{message.id};">
		{@render content()}
	</a>
{/if}
