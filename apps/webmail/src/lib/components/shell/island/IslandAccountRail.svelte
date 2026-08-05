<script lang="ts">
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import {
		accountInitial,
		accountRailMode,
		formatUnreadBadge,
		type AccountSwitcherEntry
	} from '$lib/shell/account-switcher';
	import { auth } from '$lib/stores/auth.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { cn } from '$lib/utils/cn';
	import { haptic } from '$lib/utils/haptics';

	interface Props {
		/** Override accounts (labs). Defaults to `auth.accounts`. */
		accounts?: AccountSwitcherEntry[] | null;
		/** Override unread map (labs). */
		unread?: Record<string, number> | null;
		/** Override switch handler (labs). */
		onSwitch?: ((key: string) => void | Promise<void>) | null;
	}

	let { accounts = null, unread = null, onSwitch = null }: Props = $props();

	const list = $derived(accounts ?? auth.accounts);
	const unreadMap = $derived(unread ?? auth.unread);
	const mode = $derived(accountRailMode(list.length));
	const active = $derived(list.find((account) => account.isActive) ?? list[0]);
	const overflowCount = $derived(Math.max(0, list.length - 1));

	async function switchTo(key: string) {
		const current = list.find((account) => account.isActive)?.key ?? auth.activeKey;
		if (key === current) return;
		haptic(10);
		if (onSwitch) {
			await onSwitch(key);
			return;
		}
		await auth.switchAccount(key);
	}

	function openSheet() {
		haptic(8);
		mobileIsland.openAccountSwitcher();
	}
</script>

{#if mode === 'inline'}
	<div class="z-island-account-rail" role="group" aria-label="Accounts" data-testid="account-rail">
		{#each list as account (account.key)}
			{@const count = unreadMap[account.key] ?? 0}
			{@const badge = !account.isActive ? formatUnreadBadge(count) : ''}
			<button
				type="button"
				class={cn(
					'z-island-account-rail__avatar',
					account.isActive && 'z-island-account-rail__avatar--active'
				)}
				data-testid="account-rail-avatar"
				data-account-key={account.key}
				aria-label={account.isActive
					? `Account menu for ${account.displayName}`
					: `Switch to ${account.displayName}`}
				aria-current={account.isActive ? 'true' : undefined}
				aria-expanded={account.isActive ? mobileIsland.accountSwitcherOpen : undefined}
				onclick={() => (account.isActive ? openSheet() : void switchTo(account.key))}
				oncontextmenu={(event) => {
					event.preventDefault();
					openSheet();
				}}
			>
				<Avatar
					fallback={accountInitial(account.displayName, account.username)}
					class="z-island-account-rail__glyph-avatar"
					fallbackClass="z-island-account-rail__glyph"
				/>
				{#if badge}
					<span class="z-island-account-rail__pip" aria-hidden="true">{badge}</span>
				{/if}
			</button>
		{/each}
	</div>
{:else if mode === 'overflow' && active}
	{@const othersUnread = list
		.filter((account) => !account.isActive)
		.reduce((sum, account) => sum + (unreadMap[account.key] ?? 0), 0)}
	{@const othersBadge = formatUnreadBadge(othersUnread)}
	<button
		type="button"
		class="z-island-account-rail z-island-account-rail--overflow"
		data-testid="account-rail-overflow"
		aria-label="Switch account, {overflowCount} other{overflowCount === 1 ? '' : 's'}"
		aria-expanded={mobileIsland.accountSwitcherOpen}
		onclick={openSheet}
	>
		<span class="z-island-account-rail__avatar z-island-account-rail__avatar--active">
			<Avatar
				fallback={accountInitial(active.displayName, active.username)}
				class="z-island-account-rail__glyph-avatar"
				fallbackClass="z-island-account-rail__glyph"
			/>
			{#if othersBadge}
				<span class="z-island-account-rail__pip" aria-hidden="true">{othersBadge}</span>
			{/if}
		</span>
		<span class="z-island-account-rail__more" aria-hidden="true">+{overflowCount}</span>
	</button>
{/if}
