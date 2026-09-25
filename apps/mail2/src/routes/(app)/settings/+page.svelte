<script lang="ts">
	import { goto } from '$app/navigation';
	import { whoami } from '../../session.remote';
	import { logout } from '../../login.remote';
	import { quota } from '../../mail.remote';
	import { identityStyle } from '#lib/mail/colors';
	import { initials } from '#lib/mail/rows';

	const who = whoami();
	const session = $derived(who.current ?? null);
	const quotaResource = $derived(session ? quota() : undefined);

	const storage = $derived.by(() => {
		const q = quotaResource?.current;
		if (!q || !q.limit) return null;
		const gb = (bytes: number) => (bytes / 1_000_000_000).toFixed(2);
		return { label: `${gb(q.used)} GB of ${gb(q.limit)} GB used`, pct: Math.min(100, Math.round((q.used / q.limit) * 100)) };
	});

	function signOut() {
		void logout().then(() => goto('/login', { replaceState: true }));
	}
</script>

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
		<button type="button" class="btn-tactile btn-danger shrink-0" onclick={signOut}>Sign out</button>
	</div>
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
