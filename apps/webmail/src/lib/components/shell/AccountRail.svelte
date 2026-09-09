<script lang="ts">
	/**
	 * Account switcher rail — one avatar per signed-in account, tap to switch.
	 *
	 * Previously the first avatar was the account *menu* trigger while the rest
	 * switched accounts, and all of them looked identical. Here every avatar is a
	 * switcher and the active one is a non-interactive "you are here" marker; the
	 * menu (settings, sign out, add account, overflow accounts) is a separate
	 * chevron control that does not read as another avatar.
	 *
	 * Badges resolve through auth.unreadFor(), so the active account's count is
	 * live from the mail store rather than waiting for the unread poll.
	 */
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import UserMenu from '$lib/components/shell/UserMenu.svelte';
	import { accountInitial, formatUnreadBadge } from '$lib/shell/account-switcher';
	import { auth } from '$lib/stores/auth.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		/** Avatars shown before the rest collapse into a “+N” hint. */
		max?: number;
		class?: string;
	}

	let { max = 4, class: className = '' }: Props = $props();

	const accounts = $derived(auth.accounts);
	const overflow = $derived(Math.max(0, accounts.length - max));
	/** Leave a slot for the “+N” hint when accounts are hidden. */
	const visible = $derived(overflow > 0 ? accounts.slice(0, max - 1) : accounts);
</script>

<div class={cn('z-account-rail', className)}>
	{#each visible as account (account.key)}
		{@const badge = formatUnreadBadge(auth.unreadFor(account.key))}
		{@const initial = accountInitial(account.displayName, account.username)}
		{@const label = account.displayName || account.username}

		{#if account.isActive}
			<!-- Not a button: tapping the account you are already on has no meaning,
			     and making it open the menu is exactly what made this confusing. -->
			<span
				class="z-account-rail__avatar z-account-rail__avatar--active"
				aria-current="true"
				title={label}
			>
				<span aria-hidden="true">{initial}</span>
				<span class="sr-only">Current account: {label}</span>
				{#if badge}
					<span class="z-account-rail__badge" aria-hidden="true">{badge}</span>
				{/if}
			</span>
		{:else}
			<button
				type="button"
				class="z-account-rail__avatar"
				disabled={auth.isLoading}
				aria-label={badge
					? `Switch to ${label}, ${badge} unread`
					: `Switch to ${label}`}
				title={label}
				onclick={() => auth.switchAccount(account.key)}
			>
				<span aria-hidden="true">{initial}</span>
				{#if badge}
					<span class="z-account-rail__badge" aria-hidden="true">{badge}</span>
				{/if}
			</button>
		{/if}
	{/each}

	{#if overflow > 0}
		<span class="z-account-rail__overflow" aria-hidden="true">+{overflow}</span>
	{/if}

	<UserMenu>
		{#snippet trigger()}
			<ChevronDown class="size-[1.125rem]" aria-hidden="true" />
		{/snippet}
	</UserMenu>
</div>
