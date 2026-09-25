<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { MailboxDTO, SharedMailboxDTO } from '#lib/mail/types';
	import { CHANNELS, channelStyle, identityStyle, mailboxChannel, type Channel } from '#lib/mail/colors';
	import { LABEL_FILTERS, filterName, type ListFilter } from '#lib/mail/labels';
	import { signOutAccount, switchAccount, whoami } from '../../../routes/session.remote';
	import { logout } from '../../../routes/login.remote';
	import { sections } from './SectionTabs.svelte';
	import ZaurMark from './ZaurMark.svelte';

	interface Props {
		mailboxes: MailboxDTO[] | undefined;
		/** Mailboxes other people share with you, each its own group. */
		shared?: SharedMailboxDTO[];
		/** Which of those is open; null for your own. */
		activeAccount?: string | null;
		activeMailboxId: string | null;
		onSelectMailbox: (id: string, account: string | null) => void;
		/** The list's filter; the Labels group sets it. */
		filter: ListFilter;
		onFilter: (value: ListFilter) => void;
		/** Unseen mail under each label in the open folder, keyed by filter. */
		labelCounts: Record<string, number> | undefined;
		onNewMessage: () => void;
		/** Set when the sidebar is a phone drawer: it gets its own header and a way to close. */
		onClose?: () => void;
	}

	let {
		mailboxes,
		shared = [],
		activeAccount = null,
		activeMailboxId,
		onSelectMailbox,
		filter,
		onFilter,
		labelCounts,
		onNewMessage,
		onClose
	}: Props = $props();

	/**
	 * Your flag and the server's "important" wear the channels their chips do;
	 * a category has no hue of its own, so it takes the one a custom folder
	 * does — digest, what people file into them.
	 */
	function labelChannel(label: ListFilter): Channel {
		if (label === 'flagged') return CHANNELS.flagged;
		if (label === 'important') return CHANNELS.needs;
		return CHANNELS.digest;
	}

	const who = whoami();
	const session = $derived(who.current ?? null);
	const others = $derived((session?.accounts ?? []).filter((account) => !account.active));
	let accountError = $state<string | null>(null);

	function initialsOf(name: string, email: string): string {
		const source = name.trim() || email.trim();
		if (!source) return '?';
		if (!name.trim() && source.includes('@'))
			return source.slice(0, source.indexOf('@')).slice(0, 2).toUpperCase();
		const parts = source.split(/[\s@._-]+/).filter(Boolean);
		return parts.length === 1
			? source.slice(0, 2).toUpperCase()
			: ((parts[0]![0] ?? '') + (parts[1]![0] ?? '')).toUpperCase();
	}

	function announce() {
		if (typeof BroadcastChannel === 'undefined') return;
		const channel = new BroadcastChannel('zaur-mail2-account');
		channel.postMessage('changed');
		channel.close();
	}

	async function useAccount(key: string) {
		accountError = null;
		try {
			await switchAccount({ key });
		} catch {
			accountError = 'Could not switch accounts.';
			return;
		}
		announce();
		location.assign('/');
	}

	async function signOutThis() {
		if (!session) return;
		accountError = null;
		try {
			const { signedIn } = await signOutAccount({ key: session.key });
			announce();
			location.assign(signedIn ? '/' : '/login');
		} catch {
			accountError = 'Could not sign out.';
		}
	}

	function signOutAll() {
		announce();
		void logout().then(() => goto('/login', { replaceState: true }));
	}
</script>

<!--
	A checkbox row in a channel: the open folder (or the label in force) takes
	the channel's fill and stroke, its rail lights, its box ticks in the
	channel's hue. Anything else is plain, and the box says so. A folder row is
	where you are (`aria-current`); a label row is a switch (`aria-pressed`).
-->
{#snippet checkRow(name: string, channel: Channel, on: boolean, count: number, onclick: () => void, toggle = false, depth = 0)}
	<button
		type="button"
		class="z-railed flex w-full items-center gap-2.5 rounded-[8px] border py-[7px] pr-2 pl-[18px] text-left text-[13.5px] transition-[background-color,border-color] duration-[120ms] {on
			? 'z-hue-wash font-semibold'
			: 'border-transparent font-medium text-[var(--z-strong)] hover:bg-[var(--z-hover)]'}"
		style="{channelStyle(channel)};--z-check:{channel.solid};--z-rail-inset:6px;--z-rail-strength:{on ? '1' : '0'}"
		style:color={on ? channel.ink : undefined}
		style:padding-left={depth ? `${18 + depth * 14}px` : undefined}
		aria-current={!toggle && on ? 'true' : undefined}
		aria-pressed={toggle ? on : undefined}
		{onclick}
	>
		<span class="hobday-checkbox" data-checked={on} aria-hidden="true"></span>
		<span class="min-w-0 flex-1 truncate">{name}</span>
		{#if count > 0}
			<span
				class="z-count"
				style:--z-stroke={on ? channel.stroke : 'var(--z-line)'}
				style:--z-ink-on={on ? channel.ink : 'var(--z-muted)'}
			>
				{count}
			</span>
		{/if}
	</button>
{/snippet}

<aside
	class="flex h-full w-full shrink-0 flex-col border-r border-[var(--z-line)] bg-[var(--z-surface)] select-none"
	aria-label={onClose ? 'Menu' : 'Mailboxes'}
>
	{#if onClose}
		<!--
			Drawer header: the drawer is a screen of its own on a phone. The header,
			sections and accounts are phone-only: from `md` the shell header is back
			with its tabs and avatar, and the drawer is just the folder list.
		-->
		<div class="flex h-14 shrink-0 items-center justify-between border-b border-[var(--z-hairline)] px-3 md:hidden">
			<!-- Home is this very page, so tapping the mark just puts the drawer away. -->
			<ZaurMark onNavigate={onClose} />
			<button type="button" class="z-icon-btn !size-11 !rounded-[10px]" aria-label="Close folder list" onclick={onClose}>
				<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
			</button>
		</div>
	{/if}

	{#if onClose}
		<!-- Mail's phone bar has no tabs or avatar; the drawer is where you change section and account. -->
		<nav class="grid shrink-0 grid-cols-2 gap-1 border-b border-[var(--z-hairline)] px-3 py-2 md:hidden" aria-label="Sections">
			{#each sections as section (section.href)}
				{@const current = section.match(page.url.pathname)}
				<a
					href={section.href}
					aria-current={current ? 'page' : undefined}
					data-sveltekit-preload-data="hover"
					class="flex h-11 items-center justify-center rounded-[8px] text-[14px] font-semibold {current
						? 'bg-[var(--z-accent-soft)] text-[var(--z-accent-ink)]'
						: 'text-[var(--z-strong)] active:bg-[var(--z-hover)]'}"
					onclick={(event) => {
						if (!current) return;
						event.preventDefault();
						onClose?.();
					}}
				>
					{section.label}
				</a>
			{/each}
		</nav>
	{/if}

	<div class="flex-1 overflow-y-auto px-3 py-4">
		<h2 class="z-caption mb-[9px] flex items-center justify-between px-1.5">
			Mailboxes
			<a href="/settings#folders" class="font-medium text-[var(--z-soft)] hover:text-[var(--z-accent)]" onclick={onClose}>Edit</a>
		</h2>
		<ul class="flex flex-col gap-[3px]" role="list">
			{#if mailboxes}
				{#each mailboxes as mailbox (mailbox.id)}
					{@const isSelected = !activeAccount && mailbox.id === activeMailboxId}
					<li>
						{@render checkRow(mailbox.name, mailboxChannel(mailbox.kind), isSelected, mailbox.unread, () =>
							onSelectMailbox(mailbox.id, null), false, mailbox.depth
						)}
					</li>
				{/each}
			{:else}
				{#each ['Inbox', 'Drafts', 'Sent', 'Archive', 'Trash'] as name (name)}
					<li class="z-skeleton h-[33px] rounded-[8px] bg-[var(--z-sunken)]"></li>
				{/each}
			{/if}
		</ul>

		<!--
			A mailbox shared with you is a group of its own, under its owner's
			address: just its Inbox until you open it, then every folder you can see.
		-->
		{#each shared as box (box.id)}
			{@const open = box.id === activeAccount}
			<h2 class="z-caption mt-5 mb-[9px] truncate px-1.5" title="Shared with you by {box.name}">{box.name}</h2>
			<ul class="flex flex-col gap-[3px]" role="list">
				{#each open ? box.mailboxes : box.mailboxes.filter((mailbox) => mailbox.kind === 'inbox') as mailbox (mailbox.id)}
					<li>
						{@render checkRow(mailbox.name, mailboxChannel(mailbox.kind), open && mailbox.id === activeMailboxId, mailbox.unread, () =>
							onSelectMailbox(mailbox.id, box.id), false, open ? mailbox.depth : 0
						)}
					</li>
				{/each}
			</ul>
		{/each}

		<!--
			Labels narrow the open folder to what a message carries — your flag, the
			server's "important", a category — so the folder above stays ticked. One
			label at a time: it is the list's filter, the one the header's Flagged and
			Label… show too, and ticking the ticked one lets go of it.
		-->
		<h2 class="z-caption mt-5 mb-[9px] px-1.5">Labels</h2>
		<ul class="flex flex-col gap-[3px]" role="list">
			{#each LABEL_FILTERS as label (label)}
				{@const isOn = filter === label}
				<li>
					{@render checkRow(filterName(label), labelChannel(label), isOn, labelCounts?.[label] ?? 0, () =>
						onFilter(isOn ? 'all' : label), true
					)}
				</li>
			{/each}
		</ul>
	</div>

	{#if onClose && session}
		<div class="shrink-0 border-t border-[var(--z-hairline)] px-3 py-2 md:hidden">
			<h2 class="z-caption mb-1.5 px-1.5">Accounts</h2>
			{#if accountError}
				<p class="mb-1 px-1.5 text-[12px] text-[var(--z-ch-discard-ink)]" role="alert">{accountError}</p>
			{/if}
			<div class="flex min-h-11 items-center gap-2.5 px-1.5 py-1">
				<span class="z-avatar !size-8 !text-[11px]" style={identityStyle(session.username)} aria-hidden="true">
					{initialsOf(session.displayName ?? '', session.username)}
				</span>
				<span class="min-w-0">
					<span class="block truncate text-[14px] font-semibold text-[var(--z-ink)]">
						{session.displayName ?? session.username}
					</span>
					{#if session.displayName}
						<span class="z-mono block truncate text-[11px] text-[var(--z-soft)]">{session.username}</span>
					{/if}
				</span>
			</div>
			{#each others as other (other.key)}
				<button
					type="button"
					class="flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-1.5 py-1 text-left active:bg-[var(--z-hover)]"
					onclick={() => void useAccount(other.key)}
				>
					<span class="z-avatar !size-8 !text-[11px]" style={identityStyle(other.username)} aria-hidden="true">
						{initialsOf(other.displayName ?? '', other.username)}
					</span>
					<span class="min-w-0">
						<span class="block truncate text-[14px] font-medium text-[var(--z-ink)]">
							{other.displayName ?? other.username}
						</span>
						{#if other.displayName}
							<span class="z-mono block truncate text-[11px] text-[var(--z-soft)]">{other.username}</span>
						{/if}
					</span>
				</button>
			{/each}
			<a
				href="/login?mode=add"
				class="flex h-11 items-center rounded-[8px] px-3 text-[14px] font-medium text-[var(--z-strong)] active:bg-[var(--z-hover)]"
			>
				Add account
			</a>
			{#if others.length > 0}
				<button
					type="button"
					class="flex h-11 w-full items-center rounded-[8px] px-3 text-left text-[14px] font-medium text-[var(--z-ch-discard-ink)] active:bg-[var(--z-ch-discard-hover)]"
					onclick={() => void signOutThis()}
				>
					Sign out of this account
				</button>
			{/if}
			<button
				type="button"
				class="flex h-11 w-full items-center rounded-[8px] px-3 text-left text-[14px] font-medium text-[var(--z-ch-discard-ink)] active:bg-[var(--z-ch-discard-hover)]"
				onclick={signOutAll}
			>
				{others.length > 0 ? 'Sign out of all accounts' : 'Sign out'}
			</button>
		</div>
	{/if}

	<!-- New message: the one filled control in the sidebar, with its key. -->
	<div class="border-t border-[var(--z-hairline)] p-3">
		<button
			type="button"
			class="btn-tactile btn-primary w-full {onClose ? 'h-11 text-[14px]' : 'h-[34px] text-[13px]'}"
			onclick={onNewMessage}
			title="New message (c)"
		>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
			</svg>
			<span>New message</span>
			<kbd class="z-kbd z-kbd-inverse !h-[18px] max-md:hidden" aria-hidden="true">c</kbd>
		</button>
	</div>
</aside>
