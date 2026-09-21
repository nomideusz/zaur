<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { MailboxDTO } from '#lib/mail/types';
	import { channelStyle, identityStyle, mailboxChannel } from '#lib/mail/colors';
	import { signOutAccount, switchAccount, whoami } from '../../../routes/session.remote';
	import { logout } from '../../../routes/login.remote';
	import { sections } from './SectionTabs.svelte';
	import ZaurMark from './ZaurMark.svelte';

	interface Props {
		mailboxes: MailboxDTO[] | undefined;
		activeMailboxId: string | null;
		onSelectMailbox: (id: string) => void;
		onNewMessage: () => void;
		/** Set when the sidebar is a phone drawer: it gets its own header and a way to close. */
		onClose?: () => void;
	}

	let { mailboxes, activeMailboxId, onSelectMailbox, onNewMessage, onClose }: Props = $props();

	const session = $derived(whoami()?.current ?? null);
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

<aside
	class="flex h-full w-full shrink-0 flex-col border-r border-[var(--z-line)] bg-[var(--z-surface)] select-none"
	aria-label={onClose ? 'Menu' : 'Mailboxes'}
>
	{#if onClose}
		<!-- Drawer header: the drawer is a screen of its own on a phone. -->
		<div class="flex h-14 shrink-0 items-center justify-between border-b border-[var(--z-hairline)] px-3">
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
		<!-- The header tabs hide on a phone; the drawer is where you change section. -->
		<nav class="grid shrink-0 grid-cols-2 gap-1 border-b border-[var(--z-hairline)] px-3 py-2" aria-label="Sections">
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
		<h2 class="z-caption mb-[9px] px-1.5">Mailboxes</h2>
		<ul class="flex flex-col gap-[3px]" role="list">
			{#if mailboxes}
				{#each mailboxes as mailbox (mailbox.id)}
					{@const isSelected = mailbox.id === activeMailboxId}
					{@const channel = mailboxChannel(mailbox.kind)}
					<li>
						<!--
							A checkbox row in the folder's channel: the open folder takes the
							channel's fill and stroke, its rail lights, its box fills with the
							channel's solid. A closed folder is plain, and the box says so.
						-->
						<button
							type="button"
							class="z-railed flex w-full items-center gap-2.5 rounded-[8px] border py-[7px] pr-2 pl-[18px] text-left text-[13.5px] transition-[background-color,border-color] duration-[120ms] {isSelected
								? 'z-hue-wash font-semibold'
								: 'border-transparent font-medium text-[var(--z-strong)] hover:bg-[var(--z-hover)]'}"
							style="{channelStyle(channel)};--z-check:{channel.solid};--z-rail-inset:6px;--z-rail-strength:{isSelected ? '1' : '0'}"
							style:color={isSelected ? channel.ink : undefined}
							aria-current={isSelected ? 'true' : undefined}
							onclick={() => onSelectMailbox(mailbox.id)}
						>
							<span class="hobday-checkbox" data-checked={isSelected} aria-hidden="true">
								<svg class="size-[11px]" viewBox="0 0 16 16" fill="none">
									<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</span>
							<span class="min-w-0 flex-1 truncate">{mailbox.name}</span>
							{#if mailbox.unread > 0}
								<span
									class="z-count"
									style:--z-stroke={isSelected ? channel.stroke : 'var(--z-line)'}
									style:--z-ink-on={isSelected ? channel.ink : 'var(--z-muted)'}
								>
									{mailbox.unread}
								</span>
							{/if}
						</button>
					</li>
				{/each}
			{:else}
				{#each ['Inbox', 'Drafts', 'Sent', 'Archive', 'Trash'] as name (name)}
					<li class="z-skeleton h-[33px] rounded-[8px] bg-[var(--z-sunken)]"></li>
				{/each}
			{/if}
		</ul>
	</div>

	{#if onClose && session}
		<div class="shrink-0 border-t border-[var(--z-hairline)] px-3 py-2">
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
