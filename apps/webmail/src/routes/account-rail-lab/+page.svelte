<script lang="ts">
	/**
	 * Dev-only fixture for the header account rail (AccountRail.svelte).
	 *
	 * The real component is mounted; only the auth store is stubbed. Switching is
	 * intercepted locally because the real switchAccount() posts to /api/auth/switch,
	 * which needs a session this fixture does not have.
	 *
	 * "Live unread" exercises auth.unreadFor(): the active account's badge reads
	 * activeUnread (mirrored from the mail store in the app layout) instead of the
	 * 30s poll, so it moves the instant the number changes.
	 */
	import { onMount } from 'svelte';
	import AccountRail from '$lib/components/shell/AccountRail.svelte';
	import { auth, type AccountInfo } from '$lib/stores/auth.svelte';

	const PEOPLE = [
		{ username: 'ada@zaur.app', displayName: 'Ada Lovelace' },
		{ username: 'grace@zaur.app', displayName: 'Grace Hopper' },
		{ username: 'alan@zaur.app', displayName: 'Alan Turing' },
		{ username: 'katherine@zaur.app', displayName: 'Katherine Johnson' },
		{ username: 'linus@zaur.app', displayName: 'Linus Torvalds' },
		{ username: 'margaret@zaur.app', displayName: 'Margaret Hamilton' }
	];

	let count = $state(3);
	let activeIndex = $state(0);
	let unread = $state<number[]>([4, 0, 12, 0, 0, 0]);
	let liveUnread = $state(4);

	function buildAccounts(): AccountInfo[] {
		return PEOPLE.slice(0, count).map((person, index) => ({
			key: `key-${index}`,
			username: person.username,
			displayName: person.displayName,
			isActive: index === activeIndex
		}));
	}

	function sync() {
		auth.accounts = buildAccounts();
		auth.activeKey = `key-${activeIndex}`;
		auth.unread = Object.fromEntries(
			PEOPLE.slice(0, count).map((_, index) => [`key-${index}`, unread[index] ?? 0])
		);
		auth.setActiveUnread(liveUnread);
	}

	onMount(() => {
		const realSwitch = auth.switchAccount.bind(auth);
		// Local stand-in: the real one needs a server session.
		auth.switchAccount = async (key: string) => {
			const next = Number(key.replace('key-', ''));
			if (Number.isNaN(next)) return;
			activeIndex = next;
			liveUnread = unread[next] ?? 0;
			sync();
		};
		sync();
		return () => {
			auth.switchAccount = realSwitch;
			auth.accounts = [];
			auth.activeKey = null;
			auth.unread = {};
			auth.setActiveUnread(null);
		};
	});

	$effect(() => {
		// Re-sync whenever a control moves.
		count;
		activeIndex;
		unread;
		liveUnread;
		sync();
	});
</script>

<svelte:head>
	<title>account-rail-lab</title>
</svelte:head>

<div class="lab">
	<div class="lab__controls">
		<div class="lab__row">
			<span class="lab__label">Accounts</span>
			{#each [1, 2, 3, 4, 5, 6] as n (n)}
				<button
					type="button"
					class="lab__btn"
					class:lab__btn--on={count === n}
					data-testid={`count-${n}`}
					onclick={() => {
						count = n;
						if (activeIndex >= n) activeIndex = 0;
					}}
				>
					{n}
				</button>
			{/each}
		</div>

		<div class="lab__row">
			<span class="lab__label">Active unread (live)</span>
			<button
				type="button"
				class="lab__btn"
				data-testid="live-dec"
				onclick={() => (liveUnread = Math.max(0, liveUnread - 1))}
			>
				−
			</button>
			<span class="lab__value" data-testid="live-value">{liveUnread}</span>
			<button
				type="button"
				class="lab__btn"
				data-testid="live-inc"
				onclick={() => (liveUnread += 1)}
			>
				+
			</button>
			<span class="lab__hint">
				Drives the active avatar's badge through auth.unreadFor() — no poll wait.
			</span>
		</div>

		<div class="lab__row">
			<span class="lab__label">Other accounts' unread (polled)</span>
			{#each PEOPLE.slice(0, count) as person, index (person.username)}
				{#if index !== activeIndex}
					<button
						type="button"
						class="lab__btn"
						data-testid={`bump-${index}`}
						onclick={() => {
							unread[index] = (unread[index] ?? 0) + 1;
							unread = [...unread];
						}}
					>
						{person.displayName.split(' ')[0]} +1
					</button>
				{/if}
			{/each}
		</div>
	</div>

	<div class="lab__frames">
		<section class="lab__frame">
			<h2 class="lab__title">Phone top bar (max 3)</h2>
			<div class="lab__bar">
				<span class="lab__hamburger" aria-hidden="true">☰</span>
				<span class="lab__title-text">Inbox</span>
				<AccountRail max={3} />
				<span class="lab__search" aria-hidden="true">⌕</span>
			</div>
		</section>

		<section class="lab__frame">
			<h2 class="lab__title">Desktop header (max 5)</h2>
			<div class="lab__bar lab__bar--wide">
				<span class="lab__brand">zaur</span>
				<span class="lab__spacer"></span>
				<AccountRail max={5} />
			</div>
		</section>
	</div>
</div>

<style>
	.lab {
		display: flex;
		min-height: 100dvh;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		background-color: var(--z-surface-sunken);
	}

	.lab__controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.lab__row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.lab__label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--z-fg-muted);
	}

	.lab__value {
		min-width: 1.5rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.lab__hint {
		font-size: 0.75rem;
		color: var(--z-fg-subtle);
	}

	.lab__btn {
		min-height: 2rem;
		padding-inline: 0.625rem;
		border: 1px solid var(--z-border);
		border-radius: 9999px;
		background-color: var(--z-surface-raised);
		font-size: 0.8125rem;
		color: var(--z-fg);
		cursor: pointer;
	}

	.lab__btn--on {
		border-color: var(--z-accent);
		background-color: color-mix(in srgb, var(--z-accent) 12%, transparent);
		color: var(--z-accent);
	}

	.lab__frames {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.lab__frame {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.lab__title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--z-fg-muted);
	}

	.lab__bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 390px;
		max-width: 100%;
		min-height: 3.25rem;
		padding-inline: 0.5rem;
		border: 1px solid var(--z-border-strong);
		border-radius: 0.75rem;
		background-color: var(--z-surface-raised);
	}

	.lab__bar--wide {
		width: 720px;
	}

	.lab__hamburger,
	.lab__search {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		flex-shrink: 0;
		color: var(--z-fg-muted);
	}

	.lab__title-text {
		min-width: 0;
		flex: 1 1 auto;
		overflow: hidden;
		font-size: 0.875rem;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lab__brand {
		font-size: 1.125rem;
		font-weight: 800;
		text-transform: lowercase;
		color: var(--z-accent);
	}

	.lab__spacer {
		flex: 1 1 auto;
	}
</style>
