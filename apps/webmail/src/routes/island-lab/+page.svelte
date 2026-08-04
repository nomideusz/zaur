<script lang="ts">
	// Auth-free lab for island account rail / switcher sheet (mobile multi-account).
	import { onMount } from 'svelte';
	import AccountSwitcherSheet from '$lib/components/shell/AccountSwitcherSheet.svelte';
	import IslandAccountRail from '$lib/components/shell/island/IslandAccountRail.svelte';
	import Menu from '$lib/components/icons/Menu.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import type { AccountSwitcherEntry } from '$lib/shell/account-switcher';
	import { auth } from '$lib/stores/auth.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	let accountCount = $state(2);
	let activeKey = $state('a');
	let unreadB = $state(3);
	let unreadC = $state(0);
	let unreadD = $state(12);

	onMount(() => {
		mobileIsland.accountSwitchHandler = (key) => {
			activeKey = key;
		};
		return () => {
			mobileIsland.accountSwitchHandler = null;
			mobileIsland.closeAccountSwitcher();
			auth.accounts = [];
			auth.unread = {};
			auth.activeKey = null;
		};
	});

	const names = [
		{ key: 'a', username: 'ada@zaur.app', displayName: 'Ada' },
		{ key: 'b', username: 'bob@zaur.app', displayName: 'Bob' },
		{ key: 'c', username: 'cy@zaur.app', displayName: 'Cy' },
		{ key: 'd', username: 'dee@zaur.app', displayName: 'Dee' }
	];

	const accounts = $derived.by((): AccountSwitcherEntry[] =>
		names.slice(0, accountCount).map((entry) => ({
			...entry,
			isActive: entry.key === activeKey
		}))
	);

	const unread = $derived({
		a: 0,
		b: unreadB,
		c: unreadC,
		d: unreadD
	});

	/** Keep auth in sync so AccountSwitcherSheet (which reads auth) works in the lab. */
	$effect(() => {
		auth.accounts = accounts.map((account) => ({ ...account }));
		auth.activeKey = activeKey;
		auth.unread = { ...unread };
		auth.username = accounts.find((account) => account.isActive)?.username ?? null;
		auth.displayName = accounts.find((account) => account.isActive)?.displayName ?? null;
	});

	function onSwitch(key: string) {
		activeKey = key;
	}
</script>

<svelte:head>
	<title>island-lab</title>
</svelte:head>

<div class="flex min-h-dvh flex-col bg-surface text-fg">
	<div class="flex flex-wrap items-center gap-2 border-b border-border px-2 py-2">
		<label class="flex items-center gap-1 text-sm">
			Accounts
			<select
				data-testid="account-count"
				class="rounded border border-border bg-surface-raised px-2 py-1"
				bind:value={accountCount}
				onchange={() => {
					const keys = names.slice(0, accountCount).map((entry) => entry.key);
					if (!keys.includes(activeKey)) activeKey = keys[0] ?? 'a';
				}}
			>
				<option value={1}>1</option>
				<option value={2}>2</option>
				<option value={3}>3</option>
				<option value={4}>4</option>
			</select>
		</label>
		<button
			type="button"
			data-testid="open-switcher"
			class="z-btn-ghost px-3 py-2 text-sm"
			onclick={() => mobileIsland.openAccountSwitcher()}
		>
			Open switcher
		</button>
		<span data-testid="active-key" class="text-xs text-fg-muted tabular-nums">
			active:{activeKey}
		</span>
	</div>

	<div class="flex flex-1 flex-col items-center justify-end px-4 pb-8">
		<p class="mb-auto max-w-sm pt-8 text-center text-sm text-fg-muted">
			Island account rail lab — set account count to 2–3 for one-tap avatars, 4 for overflow
			sheet.
		</p>

		<!-- Stand-in for the floating island mail tabs chrome. -->
		<div
			class="z-mobile-island z-mobile-island--wide w-full max-w-md"
			data-testid="island-lab-shell"
		>
			<div class="z-mobile-island__content w-full">
				<div class="z-mobile-island__tabs">
					<button type="button" class="z-mobile-island__icon-btn" aria-label="Menu">
						<Menu class="size-[1.125rem]" aria-hidden="true" />
					</button>
					<IslandAccountRail {accounts} {unread} {onSwitch} />
					<div class="min-w-0 flex-1 px-2 text-center text-sm text-fg-muted">All</div>
					<span class="z-mobile-island__icon-btn z-mobile-island__icon-btn--accent" aria-hidden="true">
						<PenSquare class="size-[1.125rem]" />
					</span>
				</div>
			</div>
		</div>
	</div>
</div>

<AccountSwitcherSheet />
