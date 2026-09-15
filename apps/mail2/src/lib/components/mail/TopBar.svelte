<script lang="ts">
	import { goto } from '$app/navigation';
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';
	import { getHobdayTheme } from '#lib/mail/colors';

	interface Props {
		mailboxes: MailboxDTO[] | undefined;
		activeMailbox: MailboxDTO | null;
		onSelectMailbox: (id: string) => void;
		account: { username: string; displayName: string | null } | null;
		onSignOut?: () => void;
		sidebarOpen?: boolean;
		onToggleSidebar?: () => void;
		onNewMessage?: () => void;
		onPrevMailbox?: () => void;
		onNextMailbox?: () => void;
	}

	let {
		mailboxes,
		activeMailbox,
		onSelectMailbox,
		account,
		onSignOut,
		sidebarOpen = true,
		onToggleSidebar,
		onNewMessage,
		onPrevMailbox,
		onNextMailbox
	}: Props = $props();

	let searchInput = $state<HTMLInputElement | undefined>();

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

	function focusSearch() {
		searchInput?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === '/' && document.activeElement !== searchInput) {
			event.preventDefault();
			focusSearch();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<header
	class="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[#cbd5e1] bg-white px-4 select-none"
>
	<!-- Left: Window controls + Sidebar toggle + Segmented mailbox selector -->
	<div class="flex items-center gap-3">
		<!-- macOS Window Traffic Lights -->
		<div class="flex items-center gap-1.5 pr-1" aria-hidden="true">
			<span class="mac-dot mac-dot-close"></span>
			<span class="mac-dot mac-dot-minimize"></span>
			<span class="mac-dot mac-dot-maximize"></span>
		</div>

		<div class="h-4 w-px bg-slate-200"></div>

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

		<!-- Segmented Control: [<] [ Folder Name ] [>] (Anthony Hobday design) -->
		<div class="flex items-center rounded-[6px] border border-[#cbd5e1] bg-white shadow-2xs">
			{#if onPrevMailbox}
				<button
					type="button"
					class="flex h-[30px] w-7 items-center justify-center rounded-l-[5px] text-slate-700 transition-colors hover:bg-slate-50 border-r border-[#cbd5e1]"
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
						class="flex h-[30px] items-center gap-2 px-3 text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50"
					>
						<span class="max-w-44 truncate">{activeMailbox?.name ?? 'Folder'}</span>
						{#if activeMailbox && activeMailbox.unread > 0}
							<span
								class="flex h-4 min-w-[16px] items-center justify-center rounded-[3px] bg-blue-100 px-1 text-[10px] font-semibold text-blue-700 tabular-nums"
							>
								{activeMailbox.unread}
							</span>
						{/if}
						<svg class="size-3 text-slate-400" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</Menu.Trigger>
					<Portal>
						<Menu.Positioner>
							<Menu.Content
								class="z-40 w-60 rounded-[8px] border border-[#cbd5e1] bg-white p-1.5 shadow-lg"
							>
								<div class="px-2 py-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
									Switch folder
								</div>
								{#each mailboxes as mailbox (mailbox.id)}
									<Menu.Item
										value={mailbox.id}
										onSelect={() => onSelectMailbox(mailbox.id)}
										class="flex cursor-pointer items-center justify-between gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 data-highlighted:bg-slate-100"
									>
										<span class="truncate">{mailbox.name}</span>
										{#if mailbox.unread > 0}
											<span class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 tabular-nums">
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
					class="flex h-[30px] w-7 items-center justify-center rounded-r-[5px] text-slate-700 transition-colors hover:bg-slate-50 border-l border-[#cbd5e1]"
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

	<!-- Center: Search bar -->
	<div class="flex max-w-[420px] flex-1 justify-center">
		<div class="relative w-full max-w-[360px]">
			<svg
				class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400"
				viewBox="0 0 16 16"
				fill="none"
				aria-hidden="true"
			>
				<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
				<path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
			<input
				bind:this={searchInput}
				type="search"
				placeholder="Search messages..."
				aria-label="Search mail"
				class="h-[30px] w-full rounded-[6px] border border-[#cbd5e1] bg-white pl-8 pr-7 text-[13px] text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
			<kbd
				class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] font-medium text-slate-400"
			>
				/
			</kbd>
		</div>
	</div>

	<!-- Right: Tactile [+] button + Tabs + User Profile -->
	<div class="flex items-center gap-2.5">
		{#if onNewMessage}
			<button
				type="button"
				data-new-message
				class="btn-tactile size-8 !p-0"
				onclick={onNewMessage}
				title="New message (+)"
				aria-label="New message"
			>
				<svg class="size-4 text-slate-800" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
			</button>
		{/if}

		<!-- Section Tabs -->
		<nav class="hidden sm:flex items-center rounded-[6px] border border-[#cbd5e1] bg-white p-0.5 shadow-2xs" aria-label="Sections">
			<button
				type="button"
				class="h-[26px] rounded-[4px] bg-slate-100 px-2.5 text-[12px] font-semibold text-slate-900"
				aria-current="page"
			>
				Mail
			</button>
			{#each ['Calendar', 'Contacts'] as section (section)}
				<button
					type="button"
					class="h-[26px] rounded-[4px] px-2.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-900"
					title={`${section} arrives in a later slice`}
				>
					{section}
				</button>
			{/each}
			<a
				href="/settings"
				class="flex h-[26px] items-center rounded-[4px] px-2.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-900"
			>
				Settings
			</a>
		</nav>

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
							<Menu.Item
								value="shortcuts"
								class="flex cursor-pointer items-center justify-between rounded-[6px] px-2.5 py-1.5 text-[13px] text-slate-700 data-highlighted:bg-slate-100"
								title="Arrives in a later slice"
							>
								<span>Keyboard shortcuts</span>
								<kbd class="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] text-slate-500">?</kbd>
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
