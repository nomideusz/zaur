<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import LogOut from '$lib/components/icons/LogOut.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import User from '$lib/components/icons/User.svelte';
	import UserPlus from '$lib/components/icons/UserPlus.svelte';
	import { Menu, MenuItem, MenuSurface, MenuTrigger } from '$lib/components/ui/menu';
	import {
		accountInitial,
		formatUnreadBadge,
		otherAccountsUnreadSum
	} from '$lib/shell/account-switcher';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		compact?: boolean;
		/**
		 * Replaces the default avatar trigger. The account rail passes its own so the
		 * menu opener reads as a control, not as one more avatar to tap.
		 */
		trigger?: Snippet;
	}

	let { compact = false, trigger }: Props = $props();

	let open = $state(false);

	const user = $derived({
		name: settings.resolvedDisplayName(auth.displayName ?? auth.username),
		email: auth.username ?? ''
	});
	const onSettingsRoute = $derived($page.url.pathname.startsWith('/settings'));
	/** Other mailboxes the user can switch to (the active one is shown in the header). */
	const otherAccounts = $derived(auth.accounts.filter((account) => !account.isActive));
	/** Resolve through unreadFor() so the active account's live count is included. */
	const unreadByKey = $derived(
		Object.fromEntries(auth.accounts.map((account) => [account.key, auth.unreadFor(account.key)]))
	);
	const othersUnread = $derived(
		otherAccountsUnreadSum(auth.accounts, unreadByKey, auth.activeKey)
	);
	const othersUnreadBadge = $derived(formatUnreadBadge(othersUnread));
</script>

<Menu side="bottom" align="end" bind:open>
	<MenuTrigger
		class={cn(
			'relative rounded-full border border-transparent transition-colors hover:border-border/40 hover:bg-surface-sunken/80',
			trigger ? 'z-chrome-icon-btn' : compact ? 'z-icon-tap-target p-0' : 'flex items-center gap-2 p-1.5'
		)}
		aria-label={othersUnreadBadge
			? `Account menu, ${othersUnread} unread in other accounts`
			: 'Account menu'}
	>
		{#if trigger}
			{@render trigger()}
		{:else}
			<span
				class={cn(
					'flex items-center justify-center rounded-full bg-surface-sunken text-sm font-semibold text-fg-muted',
					compact ? 'size-9' : 'size-8'
				)}
			>
				{#if auth.accounts.length > 1}
					<span aria-hidden="true">{accountInitial(user.name, user.email)}</span>
				{:else}
					<User class="size-4" aria-hidden="true" />
				{/if}
			</span>
			{#if othersUnreadBadge}
				<span
					class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold tabular-nums text-accent-fg"
					aria-hidden="true"
				>
					{othersUnreadBadge}
				</span>
			{/if}
			{#if !compact}
				<ChevronDown class="size-4 text-fg-subtle" aria-hidden="true" />
			{/if}
		{/if}
	</MenuTrigger>

	<MenuSurface class="z-overflow-menu--list w-56 min-w-56 max-w-[calc(100vw-1rem)]">
		<div class="border-b border-border px-3 py-2.5">
			<p class="truncate text-sm font-medium text-fg">
				{user.name}
			</p>
			<p class="mt-0.5 truncate text-xs text-fg-muted">{user.email}</p>
		</div>

		{#if otherAccounts.length}
			<div class="flex flex-col gap-1 border-b border-border p-1">
				{#each otherAccounts as account (account.key)}
					{@const unread = auth.unreadFor(account.key)}
					{@const badge = formatUnreadBadge(unread)}
					<MenuItem
						label={account.username}
						value={account.key}
						onSelect={() => auth.switchAccount(account.key)}
					>
						<span
							class="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[10px] font-semibold text-fg-muted"
							aria-hidden="true"
						>
							{accountInitial(account.displayName, account.username)}
						</span>
						<span class="flex min-w-0 flex-col text-left">
							<span class="truncate text-sm text-fg">{account.displayName}</span>
							{#if account.displayName.trim().toLowerCase() !== account.username.trim().toLowerCase()}
								<span class="truncate text-xs text-fg-muted">{account.username}</span>
							{/if}
						</span>
						{#if badge}
							<span
								class="ml-auto shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-xs font-medium tabular-nums text-accent"
								aria-label="{unread} unread"
							>
								{badge}
							</span>
						{/if}
					</MenuItem>
				{/each}
			</div>
		{/if}

		<div class="flex flex-col gap-1 p-1">
			<MenuItem label="Add account" value="add-account" onSelect={() => auth.addAccountFlow()}>
				<span class="flex size-5 shrink-0 items-center justify-center">
					<UserPlus class="size-4 text-fg-muted" aria-hidden="true" />
				</span>
				<span class="truncate">Add account</span>
			</MenuItem>

			<MenuItem
				label="Settings"
				value="settings"
				class={onSettingsRoute ? 'z-surface-active' : undefined}
				onSelect={() => goto('/settings/account')}
			>
				<span class="flex size-5 shrink-0 items-center justify-center">
					<Settings class="size-4 text-fg-muted" aria-hidden="true" />
				</span>
				<span class="truncate">Settings</span>
				{#if settings.enableKeyboardShortcuts}
					<span class="ml-auto shrink-0 font-mono text-[10px] text-fg-subtle">,</span>
				{/if}
			</MenuItem>

			{#if auth.accounts.length > 1}
				<MenuItem
					label="Sign out of this account"
					value="signout-account"
					onSelect={() => auth.activeKey && auth.removeAccount(auth.activeKey)}
				>
					<span class="flex size-5 shrink-0 items-center justify-center">
						<LogOut class="size-4 text-fg-muted" aria-hidden="true" />
					</span>
					<span class="truncate">Sign out of this account</span>
				</MenuItem>
			{/if}

			<MenuItem
				label="Sign out"
				value="signout"
				onSelect={() => auth.logout()}
			>
				<span class="flex size-5 shrink-0 items-center justify-center">
					<LogOut class="size-4 text-fg-muted" aria-hidden="true" />
				</span>
				<span class="truncate">{auth.accounts.length > 1 ? 'Sign out of all' : 'Sign out'}</span>
			</MenuItem>
		</div>
	</MenuSurface>
</Menu>