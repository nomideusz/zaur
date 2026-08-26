<script lang="ts">
	import Settings from '$lib/components/icons/Settings.svelte';
	import UserMenu from '$lib/components/shell/UserMenu.svelte';
	import { accountInitial, formatUnreadBadge } from '$lib/shell/account-switcher';
	import { auth } from '$lib/stores/auth.svelte';
	import { mobileShell } from '$lib/stores/mobile-shell.svelte';

	/* Drawer header: visible account rail (active avatar = account menu, other
	   accounts switch on tap) + Settings. Search lives in the top bar. */

	const otherAccounts = $derived(auth.accounts.filter((account) => !account.isActive));
</script>

<div class="z-nav-drawer__header">
	<span class="flex min-w-0 items-center gap-1">
		<UserMenu compact />
		{#each otherAccounts as account (account.key)}
			{@const badge = formatUnreadBadge(auth.unread[account.key] ?? 0)}
			<button
				type="button"
				class="z-icon-tap-target relative rounded-full border border-transparent p-0 transition-colors hover:border-border/40 hover:bg-surface-sunken/80"
				aria-label="Switch to {account.displayName}"
				onclick={() => auth.switchAccount(account.key)}
			>
				<span
					class="flex size-9 items-center justify-center rounded-full bg-surface-sunken text-sm font-semibold text-fg-muted"
				>
					{accountInitial(account.displayName, account.username)}
				</span>
				{#if badge}
					<span
						class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold tabular-nums text-accent-fg"
						aria-hidden="true"
					>
						{badge}
					</span>
				{/if}
			</button>
		{/each}
	</span>
	<a
		href="/settings"
		class="z-chrome-icon-btn no-underline"
		aria-label="Settings"
		onclick={() => mobileShell.closeNavDrawer()}
	>
		<Settings class="size-[1.125rem]" aria-hidden="true" />
	</a>
</div>
