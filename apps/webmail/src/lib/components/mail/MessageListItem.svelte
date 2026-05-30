<script lang="ts">
	import Paperclip from '$lib/components/icons/Paperclip.svelte';
	import Star from '$lib/components/icons/Star.svelte';
	import MessageListActiveActions from '$lib/components/mail/MessageListActiveActions.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import SwipeableListRow, { type SwipeAction } from '$lib/components/ui/SwipeableListRow.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatMessageListWhen } from '$lib/utils/dates';
	import { cn } from '$lib/utils/cn';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';
	import type { MessagePreview } from '$lib/types/mail';

	interface Props {
		message: MessagePreview;
		active?: boolean;
		href: string;
		bulkSelectEnabled?: boolean;
		selected?: boolean;
		onSelect?: (modifiers: { shift: boolean; ctrl: boolean }) => void;
		mailboxRouteId?: string;
		enableMobileGestures?: boolean;
	}

	let {
		message,
		active = false,
		href,
		bulkSelectEnabled = false,
		selected = false,
		onSelect,
		mailboxRouteId,
		enableMobileGestures = false
	}: Props = $props();

	let listMenuOpen = $state(false);

	const actionRouteId = $derived(mailboxRouteId ?? message.mailboxId);
	const currentMailbox = $derived(mail.mailboxByRouteId(actionRouteId));
	const canArchive = $derived(mail.canArchiveFrom(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete' : 'Delete');
	const mobileGestures = $derived(
		enableMobileGestures &&
			supportsMobileListGestures() &&
			!!onSelect &&
			!!actionRouteId &&
			!mail.hasSelection
	);

	function isMe(email: string): boolean {
		const cleanEmail = email.trim().toLowerCase();
		if (auth.username && auth.username.trim().toLowerCase() === cleanEmail) {
			return true;
		}
		return auth.identities.some((identity) => identity.email?.trim().toLowerCase() === cleanEmail);
	}

	const displayAsRecipient = $derived(
		isMe(message.from.email) && mailboxRouteId !== 'inbox' && message.to && message.to.length > 0
	);

	const senderLabel = $derived.by(() => {
		if (displayAsRecipient && message.to) {
			const recipient = message.to[0];
			const name = recipient.name?.trim() || recipient.email;
			return `To: ${name}`;
		}
		return settings.showSenderEmailInList ? message.from.email || message.from.name : message.from.name;
	});

	const when = $derived(
		formatMessageListWhen(message.receivedAt, settings.showFullDatesInList, settings.timeFormat)
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
	const selectionMode = $derived(mail.hasSelection);
	const showActiveCheckbox = $derived(bulkSelectEnabled && active && !selectionMode);
	const showListGutter = $derived(bulkSelectEnabled && (selectionMode || active));
	const showRowCheckbox = $derived(selectionMode || showActiveCheckbox);
	const isCurrent = $derived(active || selected);
	const showActiveCompact = $derived(active && !selectionMode);
	const showAvatarUnreadBadge = $derived(
		settings.highlightUnreadInList && message.unread && !showListGutter && !showActiveCompact
	);

	const rowClass = $derived(
		cn(
			'z-list-row flex w-full items-start gap-3 px-4 transition-[background-color] duration-150 ease-out',
			showActiveCompact && 'z-list-row--active-compact',
			selectionMode && 'cursor-pointer',
			!settings.hideListRowDividers && 'border-b border-border',
			settings.compactListRows ? 'py-2' : 'py-2.5',
			isCurrent && 'z-list-row--current',
			!isCurrent && 'hover:bg-surface-sunken/60'
		)
	);

	const activeSubjectClass = $derived(
		cn(
			'z-type-list-subject z-type-list-subject--active',
			settings.highlightUnreadInList && message.unread && 'z-type-list-subject--unread'
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

	function handleCheckboxClick(event: MouseEvent) {
		event.stopPropagation();
		if (!bulkSelectEnabled) return;
		if (selectionMode) {
			onSelect?.({ shift: false, ctrl: false });
			return;
		}
		if (active) {
			mail.startSelection(message.id);
		}
	}

	function handleLongPress() {
		mail.startSelection(message.id);
	}

	async function runSwipeAction(action: () => Promise<void>) {
		if (!auth.client) return;
		try {
			await action();
		} catch (err) {
			const text = err instanceof Error ? err.message : 'Action failed';
			toast.show(text, 'error');
		}
	}

	function swipeDelete() {
		if (!auth.client || !actionRouteId) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!settings.confirmDeleteMessage(1, permanent)) return;
		void runSwipeAction(() => mail.deleteMessage(auth.client!, message, actionRouteId));
	}

	function swipeArchive() {
		if (!auth.client) return;
		void runSwipeAction(() => mail.moveMessage(auth.client!, message, 'archive'));
	}

	function swipeToggleRead() {
		if (!auth.client) return;
		void runSwipeAction(() => mail.markAsRead(auth.client!, message, message.unread));
	}

	const leadingSwipeActions = $derived.by((): SwipeAction[] => {
		if (!mobileGestures) return [];
		if (canArchive) {
			return [
				{
					id: 'archive',
					label: 'Archive',
					variant: 'accent',
					onAction: swipeArchive
				}
			];
		}
		return [
			{
				id: 'read',
				label: message.unread ? 'Read' : 'Unread',
				variant: 'default',
				onAction: swipeToggleRead
			}
		];
	});

	const trailingSwipeActions = $derived.by((): SwipeAction[] => {
		if (!mobileGestures) return [];
		return [
			{
				id: 'delete',
				label: deleteLabel,
				variant: 'danger',
				onAction: swipeDelete
			}
		];
	});

	$effect(() => {
		if (!showActiveCompact) listMenuOpen = false;
	});
</script>

{#snippet listMarker()}
	{#if showListGutter}
		<div class="z-list-row-gutter z-list-row-gutter--open">
			{#if showRowCheckbox}
				<input
					type="checkbox"
					class="z-checkbox shrink-0 cursor-pointer"
					checked={selectionMode && selected}
					onclick={handleCheckboxClick}
					aria-label={selectionMode ? `Select ${displaySubject}` : `Select ${displaySubject} to enter selection mode`}
				/>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet avatar()}
	{#if settings.showAvatars}
		{@const avatarTarget = displayAsRecipient && message.to ? message.to[0] : message.from}
		<div class="relative shrink-0">
			<Avatar
				name={avatarTarget.name}
				email={avatarTarget.email}
				class={cn('mt-0.5', settings.compactListAvatars ? 'size-7' : 'size-8')}
			/>
			{#if showAvatarUnreadBadge}
				<span
					class="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-unread ring-2 ring-surface-raised"
					aria-label="Unread"
				></span>
			{/if}
		</div>
	{:else if showAvatarUnreadBadge}
		<span class="mt-2 size-2 shrink-0 rounded-full bg-unread" aria-label="Unread"></span>
	{/if}
{/snippet}

{#snippet activeContent()}
	<div class="z-list-text flex min-w-0 flex-1 flex-col overflow-hidden">
		{#if settings.subjectOnlyList}
			<div class="mt-0.5 flex min-w-0 items-center gap-1.5">
				{#if settings.showStarsInList && message.starred}
					<Star
						class="size-3.5 shrink-0 fill-star text-star md:hidden"
						aria-label="Starred"
					/>
				{/if}
				<span class={activeSubjectClass}>
					{displaySubject}
				</span>
				{#if settings.showAttachmentIcons && message.hasAttachment}
					<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-label="Has attachment" />
				{/if}
			</div>
			<div class="z-list-line--meta">
				{#if settings.showListTimestamps}
					<span class="z-type-list-time">{when}</span>
				{/if}
			</div>
			{#if settings.showListPreview}
				<div class="z-list-line--meta" aria-hidden="true"></div>
			{/if}
		{:else}
			<div class="z-list-line--sender flex items-center justify-end">
				{#if settings.showListTimestamps}
					<span class="z-type-list-time">{when}</span>
				{/if}
			</div>
			<div class="mt-0.5 flex min-w-0 items-center gap-1.5">
				<span class={activeSubjectClass}>
					{displaySubject}
				</span>
				{#if !settings.showListPreview}
					{#if settings.showAttachmentIcons && message.hasAttachment}
						<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-label="Has attachment" />
					{/if}
					{#if settings.showStarsInList && message.starred}
						<Star
							class="size-3.5 shrink-0 fill-star text-star md:hidden"
							aria-label="Starred"
						/>
					{/if}
				{/if}
			</div>
			{#if settings.showListPreview}
				<div class="z-list-line--meta">
					{#if settings.showAttachmentIcons && message.hasAttachment}
						<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-label="Has attachment" />
					{/if}
					{#if settings.showStarsInList && message.starred}
						<Star
							class="size-3.5 shrink-0 fill-star text-star md:hidden"
							aria-label="Starred"
						/>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
{/snippet}

{#snippet content()}
	{@render avatar()}
	<div class="z-list-text min-w-0 flex-1 overflow-hidden">
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
			{:else if settings.showListPreview}
				<p class="z-type-list-preview invisible select-none" aria-hidden="true">&#8203;</p>
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
			{:else if settings.showListPreview}
				<p class="z-type-list-preview invisible select-none" aria-hidden="true">&#8203;</p>
			{/if}
		{/if}
	</div>
{/snippet}

{#snippet rowInner()}
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
			{@render listMarker()}
			{@render content()}
		</div>
	{:else}
		<div
			class={rowClass}
			data-message-row
			data-hide-active-indicator={hideActiveIndicator || undefined}
		>
			{@render listMarker()}
			{#if showActiveCompact}
				<div class="flex min-w-0 flex-1 items-stretch gap-1 overflow-hidden">
					<a
						{href}
						class="flex min-w-0 flex-1 overflow-hidden text-inherit no-underline outline-none"
						aria-current="page"
						aria-label={messageAriaLabel}
						title={messageAriaLabel}
						style="view-transition-name: message-{message.id};"
						onclick={handleSelect}
						onkeydown={handleSelectKey}
					>
						{@render activeContent()}
					</a>
					{#if mailboxRouteId}
						<div class="max-md:hidden flex shrink-0 items-center self-center">
							<MessageListActiveActions
								{message}
								{mailboxRouteId}
								onMenuOpenChange={(open) => {
									listMenuOpen = open;
								}}
							/>
						</div>
					{/if}
				</div>
			{:else}
				<a
					{href}
					class="flex min-w-0 flex-1 items-start gap-3 text-inherit no-underline outline-none"
					aria-current={active ? 'page' : undefined}
					aria-label={messageAriaLabel}
					title={messageAriaLabel}
					style="view-transition-name: message-{message.id};"
					onclick={handleSelect}
					onkeydown={handleSelectKey}
				>
					{@render content()}
				</a>
			{/if}
		</div>
	{/if}
{/snippet}

<SwipeableListRow
	enabled={mobileGestures}
	leading={leadingSwipeActions}
	trailing={trailingSwipeActions}
	longPressEnabled={!!onSelect && supportsMobileListGestures() && settings.showBulkSelect}
	onLongPress={onSelect ? handleLongPress : undefined}
	class={listMenuOpen ? 'z-swipe-row--elevated' : undefined}
>
	{@render rowInner()}
</SwipeableListRow>
