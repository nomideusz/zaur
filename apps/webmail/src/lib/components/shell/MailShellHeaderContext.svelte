<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import MobilePicker from '$lib/components/ui/MobilePicker.svelte';
import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import type { MailHeaderContext } from '$lib/stores/shell-header.svelte';
	import { isSimpleMailView } from '$lib/mail/view-mode';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		ctx: MailHeaderContext | null;
	}

	let { ctx }: Props = $props();

	const threadId = $derived($page.params.threadId);
	const thread = $derived(mail.selectedThread);
	const threadSubject = $derived(thread.at(-1)?.subject ?? '(no subject)');
	const mailboxRouteId = $derived(ctx?.mailboxRouteId);
	const mobileReadingThread = $derived(
		!!threadId && !mail.hasSelection && thread.length > 0 && !mail.selectedLoading
	);
	const displayMailboxName = $derived.by(() => {
		const name = ctx?.mailboxName ?? '';
		return name.startsWith('Search:') ? name.slice(8) : name;
	});
	const showFolderTitle = $derived(!mail.hasSelection && !settings.hideListHeader);
	const mobileListSelecting = $derived(
		!!mailboxRouteId && !threadId && mail.hasSelection
	);
	const coreRoleOrder = new Map([
		['inbox', 0],
		['sent', 1],
		['drafts', 2]
	]);
	const coreFolders = $derived.by(() =>
		mail.mailboxes
			.filter((folder) => coreRoleOrder.has(folder.role ?? ''))
			.sort((a, b) => {
				const aRank = coreRoleOrder.get(a.role ?? '') ?? 99;
				const bRank = coreRoleOrder.get(b.role ?? '') ?? 99;
				return aRank - bRank;
			})
	);
	const secondaryRoleOrder = new Map([
		['archive', 0],
		['junk', 1],
		['trash', 2]
	]);
	const secondaryFolders = $derived.by(() =>
		mail.mailboxes
			.filter((folder) => !coreRoleOrder.has(folder.role ?? ''))
			.sort((a, b) => {
				const aRank = secondaryRoleOrder.get(a.role ?? '') ?? 99;
				const bRank = secondaryRoleOrder.get(b.role ?? '') ?? 99;
				return aRank - bRank || a.name.localeCompare(b.name);
			})
	);
	const activeCoreFolderId = $derived.by(() => {
		if (!mailboxRouteId) return null;
		return coreFolders.some((folder) => folder.id === mailboxRouteId) ? mailboxRouteId : null;
	});
	const activeSecondaryFolderId = $derived.by(() => {
		if (!mailboxRouteId) return null;
		return secondaryFolders.some((folder) => folder.id === mailboxRouteId) ? mailboxRouteId : null;
	});
	const showDesktopCoreSwitcher = $derived(
		!!mailboxRouteId &&
			isSimpleMailView(settings.mailViewMode) &&
			!mail.hasSelection &&
			!mobileReadingThread &&
			coreFolders.length > 0
	);
	const showDesktopMoreFolders = $derived(
		!!mailboxRouteId &&
			isSimpleMailView(settings.mailViewMode) &&
			!mail.hasSelection &&
			!mobileReadingThread &&
			secondaryFolders.length > 0
	);
	const showDesktopCurrentMailbox = $derived(
		showFolderTitle && !!mailboxRouteId && !activeCoreFolderId && !mobileReadingThread
	);
	const selectedCount = $derived(mail.selectedMessageIds.size);
	const showMobileFolderPicker = $derived(
		!!mailboxRouteId && !threadId && !mail.hasSelection && !mobileListSelecting
	);
	const folderPickerOptions = $derived(
		mail.mailboxes.map((folder) => ({
			value: folder.id,
			label: `${folder.name}${settings.showFolderUnreadCounts && folder.unread > 0 ? ` (${folder.unread})` : ''}`
		}))
	);
</script>

{#if ctx}
	<div class="flex min-w-0 flex-1 items-center gap-2">
		{#if mobileListSelecting}
			<button
				type="button"
				class="shrink-0 text-sm font-medium text-accent md:hidden"
				onclick={() => mail.clearSelection()}
			>
				Cancel
			</button>
			<h2 class="z-type-pane-title min-w-0 flex-1 truncate text-sm md:hidden">
				{selectedCount} selected
			</h2>
		{:else if ctx.onBack && threadId && !mail.hasSelection}
			<IconButton label="Back to list" class="md:hidden" onclick={ctx.onBack}>
				<ArrowLeft class="size-5" />
			</IconButton>
		{/if}

		{#if showDesktopCurrentMailbox}
			<h2 class="z-type-pane-title z-mail-core-nav-current hidden min-w-0 truncate md:block">{displayMailboxName}</h2>
		{/if}

		{#if showDesktopCoreSwitcher}
			<nav class="z-mail-core-nav hidden min-w-0 items-center md:flex" aria-label="Core folders">
				{#each coreFolders as folder (folder.id)}
					{@const isActive = folder.id === activeCoreFolderId}
					{@const badgeCount = folder.role === 'inbox' ? folder.unread : 0}
					<button
						type="button"
						class={isActive ? 'z-mail-core-nav-item z-mail-core-nav-item--active' : 'z-mail-core-nav-item'}
						aria-current={isActive ? 'page' : undefined}
						onclick={() => {
							if (!isActive) goto(`/mail/${folder.id}`);
						}}
					>
						<span>{folder.name}</span>
						{#if settings.showFolderUnreadCounts && badgeCount > 0}
							<span class={isActive ? 'ml-1.5 text-xs tabular-nums text-fg-muted' : 'ml-1.5 text-xs tabular-nums text-fg-subtle'}>
								{badgeCount}
							</span>
						{/if}
					</button>
				{/each}
				{#if showDesktopMoreFolders}
					<OverflowMenu
						class="hidden md:block"
						label="More folders"
						triggerText="More"
						menuId="desktop-more-folders-menu"
						triggerClass={activeSecondaryFolderId
							? 'z-mail-core-nav-item z-mail-core-nav-item--active z-mail-core-nav-more'
							: 'z-mail-core-nav-item z-mail-core-nav-more'}
						menuClass="z-overflow-menu--list"
					>
						{#each secondaryFolders as folder (folder.id)}
							{@const isActive = folder.id === activeSecondaryFolderId}
							{@const badgeCount = folder.role === 'drafts' ? folder.total : folder.unread}
							<OverflowMenuItem
								label={`${folder.name}${
									settings.showFolderUnreadCounts && badgeCount > 0 ? ` (${badgeCount})` : ''
								}${isActive ? ' · Current' : ''}`}
								disabled={isActive}
								onclick={() => goto(`/mail/${folder.id}`)}
							/>
						{/each}
					</OverflowMenu>
				{/if}
			</nav>
		{/if}

		{#if showMobileFolderPicker && mailboxRouteId}
			<MobilePicker
				class="md:hidden"
				label="Folder"
				value={mailboxRouteId}
				options={folderPickerOptions}
				compact={settings.compactMobileFolderPicker}
				onchange={(id) => goto(`/mail/${id}`)}
			/>
		{/if}

		{#if mobileReadingThread}
			<h2 class="z-type-pane-title min-w-0 flex-1 truncate text-sm md:hidden">{threadSubject}</h2>
		{/if}
	</div>
{/if}
