<script lang="ts">
	// Auth-free lab for lean island compose pill + account rail (top-bar style).
	import { onMount } from 'svelte';
	import AccountSwitcherSheet from '$lib/components/shell/AccountSwitcherSheet.svelte';
	import IslandAccountRail from '$lib/components/shell/island/IslandAccountRail.svelte';
	import MailViewTabs from '$lib/components/shell/MailViewTabs.svelte';
	import Menu from '$lib/components/icons/Menu.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import type { AccountSwitcherEntry } from '$lib/shell/account-switcher';
	import { auth } from '$lib/stores/auth.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	let accountCount = $state(2);
	let activeKey = $state('a');
	let unreadB = $state(3);
	let unreadC = $state(0);
	let unreadD = $state(12);

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

	$effect(() => {
		auth.accounts = accounts.map((account) => ({ ...account }));
		auth.activeKey = activeKey;
		auth.unread = { ...unread };
		auth.username = accounts.find((account) => account.isActive)?.username ?? null;
		auth.displayName = accounts.find((account) => account.isActive)?.displayName ?? null;
	});

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

	<!-- Mock fixed top bar -->
	<header class="z-mobile-topbar" data-testid="mobile-topbar">
		<div class="z-mobile-topbar__row">
			<button type="button" class="z-mobile-topbar__icon-btn" aria-label="Menu">
				<Menu class="size-[1.125rem]" aria-hidden="true" />
			</button>
			<MailViewTabs />
			<button type="button" class="z-mobile-topbar__icon-btn" aria-label="Search">
				<Search class="size-[1.125rem]" aria-hidden="true" />
			</button>
			<IslandAccountRail {accounts} {unread} {onSwitch} />
		</div>
	</header>

	<div class="flex flex-1 flex-col px-4 pb-8">
		<p class="mx-auto mb-auto max-w-sm pt-6 text-center text-sm text-fg-muted">
			Top bar holds filters + accounts; New stays bottom-right and does not shrink on scroll.
		</p>
	</div>

	<div class="z-mobile-island-positioner" data-testid="island-lab-shell">
		<div class="z-mobile-island z-mobile-island--fab">
			<div class="z-mobile-island__content">
				<div class="z-mobile-island__tabs z-mobile-island__tabs--compose" data-testid="island-compose">
					<a href="/mail/compose" class="z-mobile-island__compose-pill" aria-label="New message">
						<PenSquare class="size-[1.125rem]" aria-hidden="true" />
						<span>New</span>
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

<AccountSwitcherSheet />
