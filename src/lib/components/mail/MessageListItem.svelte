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
		onSelect?: (modifiers: { shift: boolean; ctrl: boolean }) => void;
	}

	let {
		message,
		active = false,
		href,
		selectionMode = false,
		selected = false,
		onSelect
	}: Props = $props();

	const when = $derived(formatMessageListWhen(message.receivedAt, settings.showFullDatesInList));
	const senderLabel = $derived(
		settings.showSenderEmailInList ? message.from.email || message.from.name : message.from.name
	);
	const displaySubject = $derived(message.subject.trim() || '(no subject)');
	const messageAriaLabel = $derived.by(() => {
		const flags = [
			message.unread ? 'Unread' : 'Read',
			message.starred ? 'starred' : null,
			message.hasAttachment ? 'has attachment' : null
		].filter(Boolean);
		return `${flags.join(', ')} message from ${senderLabel || message.from.email || 'Unknown sender'}: ${displaySubject}, ${when}`;
	});
	const subjectClass = $derived(
		cn(
			'z-type-list-subject',
			settings.highlightUnreadInList && message.unread && 'z-type-list-subject--unread'
		)
	);

	const hideActiveIndicator = $derived(settings.hideListActiveIndicator);
	const isCurrent = $derived(active || selected);

	const rowClass = $derived(
		cn(
			'z-list-row mx-1.5 my-1 flex gap-3 rounded-md transition-all',
			selectionMode ? 'items-center pl-4 pr-3' : 'items-start px-3',
			!settings.hideListRowDividers && 'border-b border-border/60',
			settings.compactListRows ? 'py-2' : 'py-2.5',
			selectionMode ? 'cursor-pointer' : '',
			isCurrent && 'z-list-row--current',
			!isCurrent && 'hover:bg-surface-sunken/70 hover:shadow-sm'
		)
	);

	function handleSelect(event: MouseEvent) {
		const shift = event.shiftKey;
		const ctrl = event.ctrlKey || event.metaKey;
		if (!selectionMode && !shift && !ctrl) return;
		event.preventDefault();
		onSelect?.({ shift, ctrl });
	}

	function handleSelectKey(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			focusSiblingRow(event.currentTarget as HTMLElement, event.key === 'ArrowDown' ? 1 : -1);
			return;
		}
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		onSelect?.({ shift: event.shiftKey, ctrl: event.ctrlKey || event.metaKey });
	}

	function focusSiblingRow(current: HTMLElement, delta: number) {
		const rows = Array.from(
			current.closest('section')?.querySelectorAll<HTMLElement>('[data-message-row]') ?? []
		);
		const index = rows.indexOf(current);
		if (index < 0) return;
		rows[Math.max(0, Math.min(index + delta, rows.length - 1))]?.focus();
	}

	function handleCheckboxChange() {
		onSelect?.({ shift: false, ctrl: false });
	}
</script>

{#snippet avatar()}
	{#if settings.showAvatars}
		<div class="relative shrink-0">
			<Avatar
				name={message.from.name}
				email={message.from.email}
				class={cn('mt-0.5', settings.compactListAvatars ? 'size-7' : 'size-8')}
			/>
			{#if settings.highlightUnreadInList && message.unread}
				<span
					class="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-unread ring-2 ring-surface-raised"
					aria-label="Unread"
				></span>
			{/if}
		</div>
	{:else if settings.highlightUnreadInList && message.unread}
		<span
			class="mt-2 size-2 shrink-0 rounded-full bg-unread"
			aria-label="Unread"
		></span>
	{/if}
{/snippet}

{#snippet content()}
	{@render avatar()}
	<div class="z-list-text min-w-0 flex-1">
		{#if settings.subjectOnlyList}
			<div class="flex items-baseline justify-between gap-2">
				<div class="mt-0.5 flex min-w-0 flex-1 items-center gap-1.5">
					{#if settings.showStarsInList && message.starred}
						<Star class="size-3.5 shrink-0 fill-star text-star" aria-label="Starred" />
					{/if}
					<span class={subjectClass}>
						{displaySubject}
					</span>
					{#if settings.showAttachmentIcons && message.hasAttachment}
						<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-label="Has attachment" />
					{/if}
				</div>
				{#if settings.showListTimestamps}
					<span class="z-type-list-time">{when}</span>
				{/if}
			</div>
			{#if settings.showListPreview && message.preview}
				<p class="z-type-list-preview">{message.preview}</p>
			{/if}
		{:else}
			<div class="flex items-baseline justify-between gap-2">
				<span class="z-type-list-sender">
					{senderLabel}
				</span>
				{#if settings.showListTimestamps}
					<span class="z-type-list-time">{when}</span>
				{/if}
			</div>
			<div class="mt-0.5 flex items-center gap-1.5">
				{#if settings.showStarsInList && message.starred}
					<Star class="size-3.5 shrink-0 fill-star text-star" aria-label="Starred" />
				{/if}
				<span class={subjectClass}>
					{displaySubject}
				</span>
				{#if settings.showAttachmentIcons && message.hasAttachment}
					<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-label="Has attachment" />
				{/if}
			</div>
			{#if settings.showListPreview && message.preview}
				<p class="z-type-list-preview">{message.preview}</p>
			{/if}
		{/if}
	</div>
{/snippet}

{#if selectionMode}
	<div
		class={rowClass}
		data-hide-active-indicator={hideActiveIndicator || undefined}
		role="button"
		tabindex="0"
		data-message-row
		aria-label={messageAriaLabel}
		title={messageAriaLabel}
		onclick={handleSelect}
		onkeydown={handleSelectKey}
	>
		<input
			type="checkbox"
			class="z-checkbox shrink-0"
			checked={selected}
			onclick={(e) => e.stopPropagation()}
			onchange={handleCheckboxChange}
			aria-label="Select {message.subject}"
		/>
		{@render content()}
	</div>
{:else}
	<a
		{href}
		class={rowClass}
		data-message-row
		data-hide-active-indicator={hideActiveIndicator || undefined}
		aria-current={active ? 'true' : undefined}
		aria-label={messageAriaLabel}
		title={messageAriaLabel}
		style="view-transition-name: message-{message.id};"
		onclick={handleSelect}
		onkeydown={handleSelectKey}
	>
		{@render content()}
	</a>
{/if}
