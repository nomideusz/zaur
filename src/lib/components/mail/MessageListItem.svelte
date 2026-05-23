<script lang="ts">
	import { Paperclip, Star } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import type { MessagePreview } from '$lib/types/mail';

	interface Props {
		message: MessagePreview;
		active?: boolean;
		href: string;
	}

	let { message, active = false, href }: Props = $props();

	const when = $derived(
		new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
			new Date(message.receivedAt)
		)
	);
</script>

<a
	{href}
	class={cn(
		'z-list-row flex flex-col justify-center border-b border-border px-4 transition-colors',
		active ? 'bg-surface-sunken' : 'hover:bg-surface-sunken/70',
		message.unread && 'border-l-2 border-l-unread pl-[calc(1rem-2px)]'
	)}
	style="view-transition-name: message-{message.id};"
>
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
	<p class="truncate text-xs text-fg-subtle">{message.preview}</p>
</a>
