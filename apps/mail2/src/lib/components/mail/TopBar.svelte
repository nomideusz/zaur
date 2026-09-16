<script lang="ts">
	import { goto } from '$app/navigation';
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';
	import { getHobdayTheme } from '#lib/mail/colors';
	import ZaurMark from './ZaurMark.svelte';

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
		onNextMailbox
	}: Props = $props();

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
	class="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[#cbd5e1] bg-white px-4 select-none max-md:gap-2 max-md:px-2.5"
>
	<!-- Left: Window controls + Sidebar toggle + Segmented mailbox selector -->
	<div class="flex min-w-0 items-center gap-3 max-md:gap-2">
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

		<!-- Segmented Control: [<] [ Folder Name ] [>] (Anthony Hobday design) -->
		<div class="flex min-w-0 items-center rounded-[6px] border border-[#cbd5e1] bg-white shadow-2xs">
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
						class="flex h-[30px] items-center gap-2 px-3 text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 max-md:rounded-[5px]"
					>
						<span class="max-w-44 truncate max-md:max-w-[38vw]">{activeMailbox?.name ?? 'Folder'}</span>
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

	<!-- Right: Section tabs + account -->
	<div class="ml-auto flex items-center gap-2.5">
		<!-- Section Tabs -->
		<nav class="hidden sm:flex items-center rounded-[6px] border border-[#cbd5e1] bg-white p-0.5 shadow-2xs" aria-label="Sections">
			<button
				type="button"
				class="h-[26px] rounded-[4px] bg-slate-100 px-2.5 text-[12px] font-semibold text-slate-900"
				aria-current="page"
			>
				Mail
			</button>
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
