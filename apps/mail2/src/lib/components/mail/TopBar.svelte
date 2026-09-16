<script lang="ts">
	import { goto } from '$app/navigation';
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';
	import { getHobdayTheme, mailboxTheme } from '#lib/mail/colors';
	import ZaurMark from './ZaurMark.svelte';
	import ActionIcon from './ActionIcon.svelte';
	import SectionTabs from './SectionTabs.svelte';

	interface Props {
		mailboxes: MailboxDTO[] | undefined;
		activeMailbox: MailboxDTO | null;
		onSelectMailbox: (id: string) => void;
		account: { username: string; displayName: string | null } | null;
		onSignOut?: () => void;
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
		onSignOut,
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

	const accountTheme = $derived(
		account ? getHobdayTheme(account.username) : getHobdayTheme('default')
	);

</script>

<header
	class="flex h-[52px] shrink-0 items-center gap-3 border-b border-[#cbd5e1] bg-white px-4 select-none max-md:gap-2 max-md:px-2.5"
>
	<!-- Left: Window controls + Sidebar toggle + Segmented mailbox selector -->
	<div class="flex min-w-0 shrink-0 items-center gap-3 max-md:gap-2">
		<!-- Zaur pixel mark: the brand, doubling as an ambient mailbox indicator -->
		<ZaurMark unread={activeMailbox?.unread ?? 0} />

		<div class="h-4 w-px bg-slate-200 max-md:hidden"></div>

		{#if onToggleSidebar}
			<button
				type="button"
				class="btn-tactile size-8 !p-0"
				onclick={onToggleSidebar}
				title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
				aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
			>
				<svg class="size-4 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<rect x="2" y="2.5" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.3" />
					<line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" stroke-width="1.3" />
				</svg>
			</button>
		{/if}

		<!-- Folder switcher: the inspiration's date-switcher vocabulary — tactile arrow
		     buttons around a fixed-width grey label that stays put while browsing. -->
		<div
			class="flex min-w-0 shrink-0 items-center rounded-[6px] border border-[#cbd5e1] bg-white shadow-2xs {phoneSearchOpen
				? 'max-md:hidden'
				: ''}"
		>
			{#if onPrevMailbox}
				<button
					type="button"
					class="flex h-[30px] w-7 items-center justify-center rounded-l-[5px] text-slate-700 transition-colors hover:bg-slate-50 border-r border-[#cbd5e1] max-md:hidden"
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
						class="flex h-[30px] w-[180px] items-center justify-center gap-1.5 bg-slate-100 px-2 text-[13px] font-semibold text-slate-900 transition-colors hover:bg-slate-200/70 max-md:w-auto max-md:max-w-[42vw] max-md:rounded-[5px] max-md:bg-white"
					>
						<span class="min-w-0 truncate">{activeMailbox?.name ?? 'Folder'}</span>
						{#if activeMailbox && activeMailbox.unread > 0}
							<span
								class="flex h-4 min-w-[16px] items-center justify-center rounded-[3px] bg-blue-100 px-1 text-[10px] font-semibold text-blue-700 tabular-nums"
							>
								{activeMailbox.unread}
							</span>
						{/if}
						<ActionIcon name="chevron" class="size-3 text-slate-400" />
					</Menu.Trigger>
					<Portal>
						<Menu.Positioner>
							<Menu.Content
								class="z-40 w-60 rounded-[8px] border border-[#cbd5e1] bg-white p-1.5 shadow-lg"
							>
								<div class="z-caption px-2 pt-1 pb-1.5">Switch folder</div>
								{#each mailboxes as mailbox (mailbox.id)}
									{@const colors = mailboxTheme(mailbox.kind)}
									<Menu.Item
										value={mailbox.id}
										onSelect={() => onSelectMailbox(mailbox.id)}
										class="flex cursor-pointer items-center justify-between gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100"
									>
										<span class="truncate">{mailbox.name}</span>
										{#if mailbox.unread > 0}
											<!-- The same pill the sidebar gives this folder, not a grey one. -->
											<span
												class="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[4px] border px-1 text-[11px] font-semibold tabular-nums"
												style:background-color={colors.badgeBg}
												style:border-color={colors.badgeBorder}
												style:color={colors.badgeText}
											>
												{mailbox.unread}
											</span>
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
					class="flex h-[30px] w-7 items-center justify-center rounded-r-[5px] text-slate-700 transition-colors hover:bg-slate-50 border-l border-[#cbd5e1] max-md:hidden"
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
	</div>

	<!--
		Search. The top bar used to carry an input with no handler at all, which
		is why the redesign took it out; this is the same slot, wired. Enter
		commits — a mail search runs over the whole account, and `from:ada` means
		nothing half-typed — and Escape clears back to the folder.
	-->
	{#if onSearch}
		<div
			class="flex min-w-0 flex-1 items-center justify-center px-2 {phoneSearchOpen
				? ''
				: 'max-md:hidden'}"
		>
			<div class="relative flex w-full max-w-[420px] items-center">
				<svg
					class="pointer-events-none absolute left-2.5 size-3.5 text-slate-400"
					viewBox="0 0 16 16"
					fill="none"
					aria-hidden="true"
				>
					<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
					<path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
				<input
					bind:this={searchEl}
					bind:value={draft}
					type="search"
					aria-label="Search mail"
					placeholder={activeMailbox ? `Search ${activeMailbox.name}…` : 'Search mail…'}
					class="h-[30px] w-full rounded-[6px] border border-[#cbd5e1] bg-white pr-7 pl-8 text-[13px] text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none max-md:text-base"
					onkeydown={onSearchKeydown}
				/>
				{#if draft || searchQuery}
					<button
						type="button"
						class="absolute right-1 flex size-6 items-center justify-center rounded-[4px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
						aria-label="Clear search"
						title="Clear search (esc)"
						onclick={clear}
					>
						<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Right: Section tabs + account -->
	<div class="ml-auto flex items-center gap-2.5">
		{#if onSearch && !phoneSearchOpen}
			<!-- Phone: the field swaps in for the folder switcher instead of joining it. -->
			<button
				type="button"
				class="btn-tactile !size-9 !p-0 md:hidden"
				aria-label="Search mail"
				onclick={focusSearch}
			>
				<svg class="size-4 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
					<path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
			</button>
		{/if}
		<!-- Section Tabs: Mail · Contacts · Calendar · Settings -->
		<SectionTabs class="hidden sm:flex" />

		<!-- Profile Menu -->
		{#if account}
			<Menu.Root positioning={{ placement: 'bottom-end', gutter: 8, overflowPadding: 12 }} lazyMount unmountOnExit>
				<Menu.Trigger
					class="flex size-[30px] items-center justify-center rounded-[6px] border border-[#cbd5e1] bg-white shadow-2xs transition-colors hover:border-slate-400"
					aria-label="Account"
				>
					<span
						class="flex size-[24px] items-center justify-center rounded-[4px] text-[11px] font-bold"
						style:background-color={accountTheme.bg}
						style:color={accountTheme.text}
						style:border="1px solid {accountTheme.border}"
					>
						{accountInitials}
					</span>
				</Menu.Trigger>
				<Portal>
					<Menu.Positioner>
						<Menu.Content class="z-40 w-60 rounded-[8px] border border-[#cbd5e1] bg-white p-1.5 shadow-lg">
							<div class="px-2.5 py-2 border-b border-slate-100 mb-1">
								<div class="text-[13px] font-semibold text-slate-900">{account.displayName ?? account.username}</div>
								<div class="text-xs text-slate-500 truncate">{account.username}</div>
							</div>
							<!-- The section tabs hide below `sm`; the menu is the phone's way there. -->
							<Menu.Item
								value="contacts"
								class="flex cursor-pointer items-center rounded-[6px] px-2.5 py-1.5 text-[13px] text-slate-700 data-highlighted:bg-slate-100 sm:hidden"
								onSelect={() => goto('/contacts')}
							>
								Contacts
							</Menu.Item>
							<Menu.Item
								value="calendar"
								class="flex cursor-pointer items-center rounded-[6px] px-2.5 py-1.5 text-[13px] text-slate-700 data-highlighted:bg-slate-100 sm:hidden"
								onSelect={() => goto('/calendar')}
							>
								Calendar
							</Menu.Item>
							<Menu.Item
								value="settings"
								class="flex cursor-pointer items-center rounded-[6px] px-2.5 py-1.5 text-[13px] text-slate-700 data-highlighted:bg-slate-100"
								onSelect={() => goto('/settings')}
							>
								Settings
							</Menu.Item>
							<Menu.Item
								value="signout"
								class="flex cursor-pointer items-center rounded-[6px] px-2.5 py-1.5 text-[13px] text-red-600 font-medium data-highlighted:bg-red-50"
								onSelect={() => onSignOut?.()}
							>
								Sign out
							</Menu.Item>
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu.Root>
		{/if}
	</div>
</header>
