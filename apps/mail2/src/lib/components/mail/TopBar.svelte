<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';
	import { COUNT_BADGE, channelStyle, mailboxChannel } from '#lib/mail/colors';
	import { getShell, useShellBar } from '#lib/shell.svelte.ts';
	import ActionIcon from './ActionIcon.svelte';
	import ShellHeader from './ShellHeader.svelte';

	interface Props {
		/** The page hides the whole bar on a phone while a thread is being read. */
		class?: string;
		mailboxes: MailboxDTO[] | undefined;
		activeMailbox: MailboxDTO | null;
		onSelectMailbox: (id: string) => void;
		sidebarOpen?: boolean;
		onToggleSidebar?: () => void;
		onPrevMailbox?: () => void;
		onNextMailbox?: () => void;
		/** The committed search, owned by the page; '' means "showing a folder". */
		searchQuery?: string;
		onSearch?: (query: string) => void;
	}

	let {
		class: className = '',
		mailboxes,
		activeMailbox,
		onSelectMailbox,
		sidebarOpen = true,
		onToggleSidebar,
		onPrevMailbox,
		onNextMailbox,
		searchQuery = '',
		onSearch
	}: Props = $props();

	// Mail's stretch of the shell's header. Inside the app it goes into the
	// layout's bar; `/prototype` has no shell, so there it draws the header itself.
	const shell = getShell();
	if (shell) useShellBar(shell, bar, () => className);

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


</script>

{#snippet bar()}
	<!-- Left: the sidebar toggle, the folder switcher -->
	<div class="flex min-w-0 shrink-0 items-center gap-3 max-md:gap-2">
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

	{#if onSearch && !phoneSearchOpen}
		<!-- Phone: the field swaps in for the folder switcher instead of joining it. -->
		<button
			type="button"
			class="btn-tactile ml-auto !size-8 !p-0 md:hidden"
			aria-label="Search mail"
			onclick={focusSearch}
		>
			<svg class="size-4 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<circle cx="7" cy="7" r="4.4" stroke="currentColor" stroke-width="1.4" />
				<path d="M10.4 10.4L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
			</svg>
		</button>
	{/if}
{/snippet}

{#if !shell}
	<ShellHeader {bar} class={className} />
{/if}
