<script lang="ts">
	import { whoami } from '../../session.remote';
	import { quota } from '../../mail.remote';
	import { signOutAll, signOutOf, switchTo } from '#lib/accounts';
	import { identityStyle } from '#lib/mail/colors';
	import { initials } from '#lib/mail/rows';

	const who = whoami();
	const session = $derived(who.current ?? null);
	const others = $derived((session?.accounts ?? []).filter((account) => !account.active));
	const quotaResource = $derived(session ? quota() : undefined);
	let failed = $state<string | null>(null);

	const storage = $derived.by(() => {
		const q = quotaResource?.current;
		if (!q || !q.limit) return null;
		const gb = (bytes: number) => (bytes / 1_000_000_000).toFixed(2);
		return { label: `${gb(q.used)} GB of ${gb(q.limit)} GB used`, pct: Math.min(100, Math.round((q.used / q.limit) * 100)) };
	});

	async function use(key: string) {
		failed = null;
		await switchTo(key).catch(() => (failed = 'Could not switch accounts.'));
	}

	/** With other accounts signed in, Sign out leaves this one and carries on in the next. */
	async function signOut() {
		if (!session) return;
		if (!others.length) return signOutAll();
		failed = null;
		await signOutOf(session.key).catch(() => (failed = 'Could not sign out.'));
	}
</script>

<!--
	The account, and on a phone the only place accounts live: the tab row's
	Settings wears this tile. Other accounts in the session switch in one tap.
-->
<section class="z-card">
	<div class="flex items-center justify-between gap-3 p-4">
		<div class="flex min-w-0 items-center gap-3">
			{#if session}
				<span class="z-avatar !size-[42px] !text-[14px]" style={identityStyle(session.username)} aria-hidden="true">
					{initials(session.displayName ?? '', session.username)}
				</span>
			{/if}
			<div class="min-w-0">
				<div class="truncate text-[15px] font-bold text-[var(--z-ink)]">
					{session?.displayName ?? session?.username ?? '—'}
				</div>
				<div class="z-mono truncate text-[11.5px] text-[var(--z-soft)]">{session?.username ?? ''}</div>
			</div>
		</div>
		<button type="button" class="btn-tactile btn-danger shrink-0" onclick={() => void signOut()}>Sign out</button>
	</div>

	<ul class="divide-y divide-[var(--z-hairline)] border-t border-[var(--z-hairline)]" role="list" aria-label="Accounts">
		{#each others as other (other.key)}
			<li>
				<button
					type="button"
					class="flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left hover:bg-[var(--z-hover)] active:bg-[var(--z-hover)]"
					onclick={() => void use(other.key)}
				>
					<span class="z-avatar !size-8 !text-[11px]" style={identityStyle(other.username)} aria-hidden="true">
						{initials(other.displayName ?? '', other.username)}
					</span>
					<span class="min-w-0 flex-1">
						<span class="block truncate text-[14px] font-medium text-[var(--z-ink)]">{other.displayName ?? other.username}</span>
						{#if other.displayName}
							<span class="z-mono block truncate text-[11px] text-[var(--z-soft)]">{other.username}</span>
						{/if}
					</span>
					<span class="shrink-0 text-[12.5px] font-semibold text-[var(--z-accent)]">Switch</span>
				</button>
			</li>
		{/each}
		<li>
			<a href="/login?mode=add" class="flex min-h-[52px] items-center gap-3 px-4 py-2 hover:bg-[var(--z-hover)] active:bg-[var(--z-hover)]">
				<span class="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-[var(--z-line)] text-[var(--z-muted)]" aria-hidden="true">
					<svg class="size-3.5" viewBox="0 0 16 16" fill="none">
						<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
				</span>
				<span class="text-[14px] font-medium text-[var(--z-strong)]">Add account</span>
			</a>
		</li>
		{#if others.length}
			<li>
				<button
					type="button"
					class="flex min-h-[52px] w-full items-center px-4 py-2 text-left text-[14px] font-medium text-[var(--z-ch-discard-ink)] hover:bg-[var(--z-ch-discard-hover)] active:bg-[var(--z-ch-discard-hover)]"
					onclick={signOutAll}
				>
					Sign out of all accounts
				</button>
			</li>
		{/if}
	</ul>
	{#if failed}
		<p class="border-t border-[var(--z-hairline)] px-4 py-2 text-[12.5px] text-[var(--z-ch-discard-ink)]" role="alert">{failed}</p>
	{/if}

	{#if storage}
		<div class="z-card-body flex items-center gap-2.5 !py-3">
			<span class="shrink-0 text-[12.5px] text-[var(--z-muted)]">Storage</span>
			<div class="h-[7px] flex-1 overflow-hidden rounded-full border border-[var(--z-line)] bg-[var(--z-sunken)]">
				<div class="h-full bg-[var(--z-accent)]" style:width="{storage.pct}%"></div>
			</div>
			<span class="z-mono shrink-0 text-[10.5px] text-[var(--z-muted)]">{storage.label}</span>
		</div>
	{/if}
	<p class="z-card-foot">
		<span>
			Your name and signature are set per address, under
			<a href="/settings/addresses" class="font-semibold text-[var(--z-accent)] hover:text-[var(--z-accent-edge)]">Addresses</a>.
		</span>
	</p>
</section>
