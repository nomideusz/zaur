<script lang="ts">
	import { goto } from '$app/navigation';
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';
	import { COUNT_BADGE, channelStyle, identityStyle, mailboxChannel } from '#lib/mail/colors';
	import ZaurMark from './ZaurMark.svelte';
	import ActionIcon from './ActionIcon.svelte';
	import SectionTabs from './SectionTabs.svelte';

	interface Props {
		mailboxes: MailboxDTO[] | undefined;
		activeMailbox: MailboxDTO | null;
		onSelectMailbox: (id: string) => void;
		account: { username: string; displayName: string | null } | null;
		/** The session's other signed-in accounts, switchable from the account menu. */
		otherAccounts?: { key: string; username: string; displayName: string | null }[];
		onSwitchAccount?: (key: string) => void;
		/** Signs out every account in the session. */
		onSignOut?: () => void;
		/** Signs out only the active account; offered once there is more than one. */
		onSignOutAccount?: () => void;
		sidebarOpen?: boolean;
		onToggleSidebar?: () => void;
		onPrevMailbox?: () => void;
		onNextMailbox?: () => void;
		/** The committed search, owned by the page; '' means "showing a folder". */
		searchQuery?: string;
		onSearch?: (query: string) => void;
	}

	let {
		mailboxes,
		activeMailbox,
		onSelectMailbox,
		account,
		otherAccounts = [],
		onSwitchAccount,
		onSignOut,
		onSignOutAccount,
		sidebarOpen = true,
		onToggleSidebar,
		onPrevMailbox,
		onNextMailbox,
		searchQuery = '',
		onSearch
	}: Props = $props();

	let searchEl = $state<HTMLInputElement | null>(null);
	/** What is typed, which is only the committed query once Enter says so. */
	let draft = $state('');
	/** Phone: the field takes the folder switcher's place rather than crowding it. */
	let phoneSearchOpen = $state(false);

	// A search cleared from outside (Escape in the list, a folder switch) has to
	// empty the field too, or the next Enter would re-run a query that is gone.
	$effect(() => {
		if (!searchQuery) draft = '';
		else draft = searchQuery;
	});

	export function focusSearch() {
		phoneSearchOpen = true;
		// The field may be mounting this tick on a phone.
		queueMicrotask(() => searchEl?.focus());
	}

	function commit() {
		onSearch?.(draft.trim());
	}

	function clear() {
		draft = '';
		onSearch?.('');
		phoneSearchOpen = false;
	}

	function onSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			if (draft || searchQuery) clear();
			else phoneSearchOpen = false;
			searchEl?.blur();
		}
	}

	const initialsOf = (name: string, email: string) => {
		const source = name.trim() || email.trim();
		if (!source) return '?';
		if (!name.trim() && source.includes('@'))
			return source.slice(0, source.indexOf('@')).slice(0, 2).toUpperCase();
		const parts = source.split(/[\s@._-]+/).filter(Boolean);
		return parts.length === 1
			? source.slice(0, 2).toUpperCase()
			: ((parts[0]![0] ?? '') + (parts[1]![0] ?? '')).toUpperCase();
	};

	const accountInitials = $derived(
		account ? initialsOf(account.displayName ?? '', account.username) : '·'
	);
</script>

<header
	class="flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--z-line)] bg-[var(--z-surface)] px-4 select-none max-md:gap-2 max-md:px-2.5"
>
	<!-- Left: the mark, the sidebar toggle, the folder switcher -->
	<div class="flex min-w-0 shrink-0 items-center gap-3 max-md:gap-2">
		<ZaurMark />

		<div class="h-4 w-px bg-[var(--z-hairline)] max-md:hidden"></div>

		{#if onToggleSidebar}
			<button
				type="button"
				class="btn-tactile !size-8 !p-0"
				onclick={onToggleSidebar}
				title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
				aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
			>
				<svg class="size-4 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<!-- The left column fills while the mailbox list is open. -->
					{#if sidebarOpen}<rect x="2" y="2.5" width="4" height="11" rx="2" fill="currentColor" opacity="0.35" />{/if}
					<rect x="2" y="2.5" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.3" />
					<line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" stroke-width="1.3" />
				</svg>
			</button>
		{/if}

		<!-- Folder switcher: tactile arrows around a fixed-width sunken label
		     that stays put while browsing, so the eye has one place to read.
		     Only while the mailbox list is closed — open, the list already names
		     the folder and carries its count. -->
		{#if !sidebarOpen}
			<div
				class="flex min-w-0 shrink-0 items-center rounded-[8px] border border-[var(--z-line)] bg-[var(--z-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.05)] {phoneSearchOpen
					? 'max-md:hidden'
					: ''}"
			>
				{#if onPrevMailbox}
					<button
						type="button"
						class="flex h-[30px] w-7 items-center justify-center rounded-l-[7px] border-r border-[var(--z-line)] text-[var(--z-strong)] transition-colors hover:bg-[var(--z-hover)] max-md:hidden"
						onclick={onPrevMailbox}
						title="Previous mailbox"
						aria-label="Previous mailbox"
					>
						<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
				{/if}

				{#if mailboxes}
					<Menu.Root positioning={{ placement: 'bottom-start', gutter: 8, overflowPadding: 12 }} lazyMount unmountOnExit>
						<Menu.Trigger
							class="flex h-[30px] w-[184px] items-center justify-center gap-[7px] bg-[var(--z-sunken)] px-2.5 text-[13px] font-semibold text-[var(--z-ink)] transition-colors hover:bg-[var(--z-sunken)] max-md:w-auto max-md:max-w-[46vw] max-md:rounded-[7px] max-md:bg-[var(--z-surface)]"
						>
							{#if activeMailbox}
								{@const channel = mailboxChannel(activeMailbox.kind)}
								<!-- The folder's channel swatch: the collapsed stand-in for its row in the list. -->
								<span
									class="inline-block size-2.5 shrink-0 rounded-[3px] border"
									style:background-color={channel.fill}
									style:border-color={channel.stroke}
									aria-hidden="true"
								></span>
							{/if}
							<span class="min-w-0 truncate">{activeMailbox?.name ?? 'Folder'}</span>
							{#if activeMailbox && activeMailbox.unread > 0}
								<span
									class="z-count !h-[17px] !min-w-[17px] !px-1 !text-[10px]"
									style:--z-stroke={COUNT_BADGE.border}
									style:--z-ink-on={COUNT_BADGE.text}
									style:background-color={COUNT_BADGE.bg}
								>
									{activeMailbox.unread}
								</span>
							{/if}
							<ActionIcon name="chevron" class="size-3 text-[var(--z-faint)]" />
						</Menu.Trigger>
						<Portal>
							<Menu.Positioner>
								<Menu.Content class="z-menu z-40 w-60">
									<div class="z-menu-caption">Switch folder</div>
									{#each mailboxes as mailbox (mailbox.id)}
										{@const channel = mailboxChannel(mailbox.kind)}
										<Menu.Item
											value={mailbox.id}
											onSelect={() => onSelectMailbox(mailbox.id)}
											class="z-menu-item justify-between"
										>
											<span class="flex min-w-0 items-center gap-[9px]">
												<span
													class="inline-block size-2.5 shrink-0 rounded-[3px] border"
													style:background-color={channel.fill}
													style:border-color={channel.stroke}
													aria-hidden="true"
												></span>
												<span class="truncate">{mailbox.name}</span>
											</span>
											{#if mailbox.unread > 0}
												<span class="z-count" style={channelStyle(channel)}>{mailbox.unread}</span>
											{/if}
										</Menu.Item>
									{/each}
								</Menu.Content>
							</Menu.Positioner>
						</Portal>
					</Menu.Root>
				{/if}

				{#if onNextMailbox}
					<button
						type="button"
						class="flex h-[30px] w-7 items-center justify-center rounded-r-[7px] border-l border-[var(--z-line)] text-[var(--z-strong)] transition-colors hover:bg-[var(--z-hover)] max-md:hidden"
						onclick={onNextMailbox}
						title="Next mailbox"
						aria-label="Next mailbox"
					>
						<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!--
		Search. Enter commits — a mail search runs over the whole account, and
		`from:ada` means nothing half-typed — and Escape clears back to the folder.
	-->
	{#if onSearch}
		<div
			class="flex min-w-0 flex-1 items-center justify-center px-2 {phoneSearchOpen
				? ''
				: 'max-md:hidden'}"
		>
			<div class="relative flex w-full max-w-[420px] items-center">
				<svg
					class="pointer-events-none absolute left-2.5 size-3.5 text-[var(--z-faint)]"
					viewBox="0 0 16 16"
					fill="none"
					aria-hidden="true"
				>
					<circle cx="7" cy="7" r="4.4" stroke="currentColor" stroke-width="1.4" />
					<path d="M10.4 10.4L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
				</svg>
				<input
					bind:this={searchEl}
					bind:value={draft}
					type="search"
					aria-label="Search mail"
					placeholder={activeMailbox ? `Search ${activeMailbox.name}…` : 'Search mail…'}
					class="z-field !h-[30px] w-full !pr-7 !pl-8 !text-[12.5px] max-md:!text-base"
					onkeydown={onSearchKeydown}
				/>
				{#if draft || searchQuery}
					<button
						type="button"
						class="z-icon-btn absolute right-0.5 !size-6"
						aria-label="Clear search"
						title="Clear search (esc)"
						onclick={clear}
					>
						<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
						</svg>
					</button>
				{:else}
					<kbd class="z-kbd pointer-events-none absolute right-1.5 max-md:hidden" aria-hidden="true">/</kbd>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Right: section tabs + account -->
	<div class="ml-auto flex items-center gap-2.5">
		{#if onSearch && !phoneSearchOpen}
			<!-- Phone: the field swaps in for the folder switcher instead of joining it. -->
			<button
				type="button"
				class="btn-tactile !size-8 !p-0 md:hidden"
				aria-label="Search mail"
				onclick={focusSearch}
			>
				<svg class="size-4 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<circle cx="7" cy="7" r="4.4" stroke="currentColor" stroke-width="1.4" />
					<path d="M10.4 10.4L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
				</svg>
			</button>
		{/if}

		<SectionTabs class="hidden sm:flex" />

		<!-- Account: the person's identity tile, the same tone their card wears. -->
		{#if account}
			<Menu.Root positioning={{ placement: 'bottom-end', gutter: 8, overflowPadding: 12 }} lazyMount unmountOnExit>
				<Menu.Trigger
					class="z-avatar cursor-pointer transition-[filter] hover:brightness-[0.97]"
					style={identityStyle(account.username)}
					aria-label="Account"
				>
					{accountInitials}
				</Menu.Trigger>
				<Portal>
					<Menu.Positioner>
						<Menu.Content class="z-menu z-40 w-60">
							<div class="mb-1 flex items-center gap-2.5 border-b border-[var(--z-hairline)] px-2 pt-1 pb-2.5">
								<span class="z-avatar" style={identityStyle(account.username)} aria-hidden="true">{accountInitials}</span>
								<span class="min-w-0">
									<span class="block truncate text-[13px] font-semibold text-[var(--z-ink)]">{account.displayName ?? account.username}</span>
									<span class="z-mono block truncate text-[10.5px] text-[var(--z-soft)]">{account.username}</span>
								</span>
							</div>
							<!-- Other accounts in this session: one click makes it the active one. -->
							{#each otherAccounts as other (other.key)}
								<Menu.Item value="account:{other.key}" class="z-menu-item !h-auto gap-2.5 !py-1.5" onSelect={() => onSwitchAccount?.(other.key)}>
									<span class="z-avatar !size-6 !text-[10px]" style={identityStyle(other.username)} aria-hidden="true">
										{initialsOf(other.displayName ?? '', other.username)}
									</span>
									<span class="min-w-0">
										<span class="block truncate text-[12.5px] text-[var(--z-ink)]">{other.displayName ?? other.username}</span>
										<span class="z-mono block truncate text-[10px] text-[var(--z-soft)]">{other.username}</span>
									</span>
								</Menu.Item>
							{/each}
							<Menu.Item value="add-account" class="z-menu-item" onSelect={() => goto('/login?mode=add')}>Add account</Menu.Item>
							<div class="my-1 h-px bg-[var(--z-hairline)]" aria-hidden="true"></div>
							<!-- The section tabs hide below `sm`; the menu is the phone's way there. -->
							<Menu.Item value="contacts" class="z-menu-item sm:hidden" onSelect={() => goto('/contacts')}>Contacts</Menu.Item>
							<Menu.Item value="calendar" class="z-menu-item sm:hidden" onSelect={() => goto('/calendar')}>Calendar</Menu.Item>
							<Menu.Item value="settings" class="z-menu-item" onSelect={() => goto('/settings')}>Settings</Menu.Item>
							{#if otherAccounts.length > 0}
								<Menu.Item
									value="signout-account"
									class="z-menu-item !text-[var(--z-ch-discard-ink)] data-highlighted:!bg-[var(--z-ch-discard-hover)]"
									onSelect={() => onSignOutAccount?.()}
								>
									Sign out of this account
								</Menu.Item>
							{/if}
							<Menu.Item
								value="signout"
								class="z-menu-item !text-[var(--z-ch-discard-ink)] data-highlighted:!bg-[var(--z-ch-discard-hover)]"
								onSelect={() => onSignOut?.()}
							>
								{otherAccounts.length > 0 ? 'Sign out of all accounts' : 'Sign out'}
							</Menu.Item>
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu.Root>
		{/if}
	</div>
</header>
