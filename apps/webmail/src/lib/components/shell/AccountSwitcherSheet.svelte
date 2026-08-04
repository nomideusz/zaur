<script lang="ts">
	import { Drawer } from '@ark-ui/svelte/drawer';
	import { Portal } from '@ark-ui/svelte/portal';
	import User from '$lib/components/icons/User.svelte';
	import UserPlus from '$lib/components/icons/UserPlus.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import {
		accountInitial,
		formatUnreadBadge,
		orderedAccountsForSwitcher
	} from '$lib/shell/account-switcher';
	import { auth } from '$lib/stores/auth.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { cn } from '$lib/utils/cn';

	const accounts = $derived(orderedAccountsForSwitcher(auth.accounts));
	const open = $derived(mobileIsland.accountSwitcherOpen);

	const snapPoints = [0.55];

	async function switchTo(key: string, isActive: boolean) {
		mobileIsland.closeAccountSwitcher();
		if (isActive) return;
		if (mobileIsland.accountSwitchHandler) {
			await mobileIsland.accountSwitchHandler(key);
			return;
		}
		await auth.switchAccount(key);
	}

	function addAccount() {
		mobileIsland.closeAccountSwitcher();
		if (mobileIsland.accountSwitchHandler) return;
		auth.addAccountFlow();
	}
</script>

<Drawer.Root
	{open}
	onOpenChange={(details) => {
		mobileIsland.accountSwitcherOpen = details.open;
	}}
	swipeDirection="down"
	{snapPoints}
	defaultSnapPoint={snapPoints[0]}
	lazyMount
	unmountOnExit
>
	<Portal>
		<Drawer.Backdrop class="z-mailbox-drawer-backdrop fixed inset-0 bg-black/50 md:hidden" />
		<Drawer.Positioner
			class="z-mailbox-drawer-positioner fixed inset-0 flex items-end justify-center md:hidden"
		>
			<Drawer.Content
				class="z-mail-view z-account-switcher-sheet flex w-full max-w-lg flex-col bg-surface-raised outline-none"
			>
				<Drawer.Title class="sr-only">Switch account</Drawer.Title>
				<Drawer.Grabber class="z-mailbox-drawer-grabber">
					<Drawer.GrabberIndicator class="z-mailbox-drawer-grabber-indicator" />
				</Drawer.Grabber>

				<div class="px-4 pb-2 pt-1">
					<p class="text-sm font-medium text-fg">Accounts</p>
					<p class="mt-0.5 text-xs text-fg-muted">Tap an account to switch</p>
				</div>

				<ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2" role="list">
					{#each accounts as account (account.key)}
						{@const unread = auth.unread[account.key] ?? 0}
						{@const badge = formatUnreadBadge(unread)}
						<li>
							<button
								type="button"
								class={cn(
									'z-account-switcher-row flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
									account.isActive
										? 'bg-accent/10'
										: 'hover:bg-surface-sunken/80 active:bg-surface-sunken'
								)}
								aria-current={account.isActive ? 'true' : undefined}
								onclick={() => void switchTo(account.key, account.isActive)}
							>
								<Avatar
									fallback={accountInitial(account.displayName, account.username)}
									class={cn(
										'z-account-avatar size-10 shrink-0 text-sm font-semibold',
										account.isActive
											? 'bg-accent text-accent-fg ring-2 ring-accent ring-offset-2 ring-offset-surface-raised'
											: 'bg-surface-sunken text-fg-muted'
									)}
									fallbackClass="z-avatar__fallback--fill"
								/>
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate text-sm font-medium text-fg">
										{account.displayName}
										{#if account.isActive}
											<span class="font-normal text-fg-muted"> · current</span>
										{/if}
									</span>
									{#if account.displayName.trim().toLowerCase() !== account.username.trim().toLowerCase()}
										<span class="truncate text-xs text-fg-muted">{account.username}</span>
									{/if}
								</span>
								{#if badge && !account.isActive}
									<span
										class="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-xs font-medium tabular-nums text-accent"
										aria-label="{unread} unread"
									>
										{badge}
									</span>
								{:else if account.isActive}
									<User class="size-4 shrink-0 text-accent" aria-hidden="true" />
								{/if}
							</button>
						</li>
					{/each}
				</ul>

				<div class="border-t border-border p-2">
					<button
						type="button"
						class="z-account-switcher-row flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-fg hover:bg-surface-sunken/80"
						onclick={addAccount}
					>
						<span
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-fg-muted"
							aria-hidden="true"
						>
							<UserPlus class="size-5" />
						</span>
						<span class="text-sm font-medium">Add account</span>
					</button>
				</div>
			</Drawer.Content>
		</Drawer.Positioner>
	</Portal>
</Drawer.Root>
