<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { DropdownMenu } from 'bits-ui';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import LogOut from '$lib/components/icons/LogOut.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import User from '$lib/components/icons/User.svelte';
	import UserPlus from '$lib/components/icons/UserPlus.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		compact = false
	}: {
		compact?: boolean;
	} = $props();

	let open = $state(false);

	const user = $derived({
		name: settings.resolvedDisplayName(auth.displayName ?? auth.username),
		email: auth.username ?? ''
	});
	const onSettingsRoute = $derived($page.url.pathname.startsWith('/settings'));
	/** Other mailboxes the user can switch to (the active one is shown in the header). */
	const otherAccounts = $derived(auth.accounts.filter((account) => !account.isActive));
</script>

<DropdownMenu.Root bind:open>
	<DropdownMenu.Trigger
		class={cn(
			'rounded-md border border-transparent transition-colors hover:border-border/40 hover:bg-surface-sunken/80',
			compact ? 'z-icon-tap-target p-0' : 'flex items-center gap-2 p-1.5'
		)}
		aria-label="Account menu"
	>
		<span
			class={cn(
				'flex items-center justify-center rounded-full bg-surface-sunken text-fg-muted',
				compact ? 'size-9' : 'size-8'
			)}
		>
			<User class="size-4" aria-hidden="true" />
		</span>
		{#if !compact}
			<ChevronDown class="size-4 text-fg-subtle" aria-hidden="true" />
		{/if}
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<DropdownMenu.Content
			side="bottom"
			align="end"
			sideOffset={8}
			collisionPadding={12}
			sticky="always"
			updatePositionStrategy="always"
			class="z-overflow-menu z-overflow-menu--fixed z-overflow-menu--list w-56 min-w-56 max-w-[calc(100vw-1rem)]"
		>
			<div class="border-b border-border px-3 py-2.5">
				<p class="truncate text-sm font-medium text-fg">
					{user.name}
				</p>
				<p class="mt-0.5 truncate text-xs text-fg-muted">{user.email}</p>
			</div>

			{#if otherAccounts.length}
				<div class="flex flex-col gap-1 border-b border-border p-1">
					{#each otherAccounts as account (account.key)}
						<DropdownMenu.Item
							class="z-overflow-menu-item"
							textValue={account.username}
							onSelect={() => auth.switchAccount(account.key)}
						>
							<span class="flex size-5 shrink-0 items-center justify-center">
								<User class="size-4 text-fg-muted" aria-hidden="true" />
							</span>
							<span class="flex min-w-0 flex-col text-left">
								<span class="truncate text-sm text-fg">{account.displayName}</span>
								{#if account.displayName.trim().toLowerCase() !== account.username.trim().toLowerCase()}
									<span class="truncate text-xs text-fg-muted">{account.username}</span>
								{/if}
							</span>
							{#if (auth.unread[account.key] ?? 0) > 0}
								<span
									class="ml-auto shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-xs font-medium tabular-nums text-accent"
									aria-label="{auth.unread[account.key]} unread"
								>
									{auth.unread[account.key] > 99 ? '99+' : auth.unread[account.key]}
								</span>
							{/if}
						</DropdownMenu.Item>
					{/each}
				</div>
			{/if}

			<div class="flex flex-col gap-1 p-1">
				<DropdownMenu.Item
					class="z-overflow-menu-item"
					textValue="Add account"
					onSelect={() => auth.addAccountFlow()}
				>
					<span class="flex size-5 shrink-0 items-center justify-center">
						<UserPlus class="size-4 text-fg-muted" aria-hidden="true" />
					</span>
					<span class="truncate">Add account</span>
				</DropdownMenu.Item>

				<DropdownMenu.Item
					class={cn('z-overflow-menu-item', onSettingsRoute && 'z-surface-active')}
					textValue="Settings"
					onSelect={() => goto('/settings/account')}
				>
					<span class="flex size-5 shrink-0 items-center justify-center">
						<Settings class="size-4 text-fg-muted" aria-hidden="true" />
					</span>
					<span class="truncate">Settings</span>
				</DropdownMenu.Item>

				{#if auth.accounts.length > 1}
					<DropdownMenu.Item
						class="z-overflow-menu-item"
						textValue="Sign out of this account"
						onSelect={() => auth.activeKey && auth.removeAccount(auth.activeKey)}
					>
						<span class="flex size-5 shrink-0 items-center justify-center">
							<LogOut class="size-4 text-fg-muted" aria-hidden="true" />
						</span>
						<span class="truncate">Sign out of this account</span>
					</DropdownMenu.Item>
				{/if}

				<DropdownMenu.Item
					class="z-overflow-menu-item"
					textValue="Sign out"
					onSelect={() => auth.logout()}
				>
					<span class="flex size-5 shrink-0 items-center justify-center">
						<LogOut class="size-4 text-fg-muted" aria-hidden="true" />
					</span>
					<span class="truncate">{auth.accounts.length > 1 ? 'Sign out of all' : 'Sign out'}</span>
				</DropdownMenu.Item>
			</div>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
