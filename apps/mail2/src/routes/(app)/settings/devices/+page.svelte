<script lang="ts">
	import { messageOf } from '#lib/errors';
	import { goto } from '$app/navigation';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import ConfirmIdentity from '#lib/components/settings/ConfirmIdentity.svelte';
	import { describeUserAgent, relativeTime } from '#lib/settings/devices';
	import { whoami } from '../../../session.remote';
	import { securityOverview, revokeSession, revokeOtherSessions, type SessionDTO } from '../../../security.remote';

	const who = whoami();
	const overviewResource = $derived(who.current ? securityOverview() : undefined);
	const overview = $derived(overviewResource?.current ?? null);

	let status = $state<{ text: string; error?: boolean } | null>(null);
	let locked = $state(true);
	let busy = $state<string | null>(null);

	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	const sessions = $derived(
		[...(overview?.sessions ?? [])].sort((a, b) => Number(b.current) - Number(a.current) || b.lastSeenAt - a.lastSeenAt)
	);
	const others = $derived(sessions.filter((item) => !item.current));

	async function signOutSession(item: SessionDTO) {
		if (item.current && !confirm('Sign out of this device? You will be taken to the sign-in page.')) return;
		busy = item.id;
		status = null;
		try {
			const result = await revokeSession({ id: item.id });
			if (result.current) {
				await goto('/login', { replaceState: true });
				return;
			}
			status = { text: result.revoked ? 'Device signed out' : 'That device was already signed out' };
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not sign out that device'), error: true };
		} finally {
			busy = null;
		}
	}

	async function signOutOthers() {
		if (!confirm('Sign out every other device? They will need the password to get back in.')) return;
		busy = 'others';
		status = null;
		try {
			const { revoked } = await revokeOtherSessions();
			status = { text: revoked === 1 ? '1 device signed out' : `${revoked} devices signed out` };
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not sign out the other devices'), error: true };
		} finally {
			busy = null;
		}
	}
</script>

<StatusNote {status} />

{#if overviewResource?.error}
	<section class="z-card p-4 text-[13px] text-[var(--z-ch-discard-ink)]">
		Could not load your devices.
		<button type="button" class="btn-tactile ml-2 !h-[28px]" onclick={() => overviewResource?.refresh()}>Retry</button>
	</section>
{:else if !overview}
	<section class="z-card z-skeleton h-[160px]" aria-hidden="true"></section>
{:else}
	<ConfirmIdentity verifiedUntil={overview.verifiedUntil} totpEnabled={overview.totpEnabled} bind:locked onStatus={(next) => (status = next)} />

	<section class="z-card">
		<div class="z-card-head justify-between">
			<h2>{sessions.length === 1 ? '1 device' : `${sessions.length} devices`}</h2>
			{#if others.length}
				<button type="button" class="btn-tactile btn-danger !h-[28px]" disabled={locked || busy === 'others'} onclick={signOutOthers}>
					{busy === 'others' ? 'Signing out…' : 'Sign out others'}
				</button>
			{/if}
		</div>
		<ul class="divide-y divide-[var(--z-hairline)] border-t border-[var(--z-hairline)]" role="list">
			{#each sessions as item (item.id)}
				<li class="flex items-center justify-between gap-3 px-4 py-2.5">
					<div class="min-w-0">
						<div class="flex items-center gap-2 text-[13.5px] font-medium text-[var(--z-body)]">
							<span class="truncate">{describeUserAgent(item.userAgent)}</span>
							{#if item.current}
								<span class="z-chip !normal-case !tracking-normal" style="--z-stroke:var(--z-accent-stroke);--z-ink-on:var(--z-accent-ink)">This device</span>
							{/if}
						</div>
						<div class="text-[12px] text-[var(--z-faint)]">
							Active {relativeTime(item.lastSeenAt, now)} · signed in {relativeTime(item.createdAt, now)}
						</div>
					</div>
					<button type="button" class="btn-tactile !h-[28px] shrink-0" disabled={locked || busy === item.id} onclick={() => signOutSession(item)}>
						{busy === item.id ? '…' : 'Sign out'}
					</button>
				</li>
			{/each}
		</ul>
		<p class="z-card-foot">
			Browsers signed in through Zaur Mail (1.0 and 2.0 share these). Mail apps are not listed — revoke their
			<a href="/settings/app-passwords" class="font-semibold text-[var(--z-accent)] hover:text-[var(--z-accent-edge)]">app password</a>.
		</p>
	</section>
{/if}
