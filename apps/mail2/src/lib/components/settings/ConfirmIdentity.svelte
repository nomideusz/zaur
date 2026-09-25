<script lang="ts">
	/**
	 * The recent-password window the security pages share: creating app
	 * passwords, signing out devices and changing the recovery address all need
	 * it. Locked, it is a card asking for the password; confirmed, a line
	 * counting the window down. `locked` binds back to the page.
	 */
	import { confirmIdentity, securityOverview } from '../../../routes/security.remote';

	let {
		verifiedUntil,
		totpEnabled,
		locked = $bindable(true),
		onStatus
	}: {
		verifiedUntil: number | null | undefined;
		totpEnabled: boolean;
		locked?: boolean;
		onStatus: (status: { text: string; error?: boolean } | null) => void;
	} = $props();

	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});
	const left = $derived(verifiedUntil ? Math.max(0, verifiedUntil - now) : 0);
	$effect(() => {
		locked = left <= 0;
	});
	const countdown = $derived.by(() => {
		const seconds = Math.ceil(left / 1000);
		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	});

	// The window running out changes what the server reports.
	$effect(() => {
		if (verifiedUntil && verifiedUntil <= now) void securityOverview().refresh();
	});

	const result = $derived(confirmIdentity.result);
	const showTotp = $derived(totpEnabled || (result?.ok === false && result.requiresTotp === true));
	$effect(() => {
		if (!result) return;
		onStatus(result.ok ? (result.message ? { text: result.message } : null) : { text: result.error, error: true });
	});
</script>

{#if locked}
	<section class="z-card z-railed" style:--z-rail="var(--z-accent)">
		<h2 class="z-card-head">Confirm it's you</h2>
		<div class="z-card-body">
			<p class="text-[12.5px] leading-[1.6] text-[var(--z-muted)]">
				Enter your password to change things here. It stays confirmed for a few minutes.
			</p>
			<form {...confirmIdentity} class="mt-3 flex flex-wrap items-end gap-2">
				<label class="min-w-0 flex-1 basis-[200px]">
					<span class="block text-[12px] text-[var(--z-soft)]">Password</span>
					<input {...confirmIdentity.fields._password.as('password')} autocomplete="current-password" required class="z-field mt-1 w-full max-md:text-base" />
				</label>
				{#if showTotp}
					<label class="basis-[140px]">
						<span class="block text-[12px] text-[var(--z-soft)]">Code</span>
						<input
							{...confirmIdentity.fields.totp.as('text')}
							inputmode="numeric"
							autocomplete="one-time-code"
							placeholder="123456"
							class="z-field mt-1 w-full font-mono tracking-[0.2em] max-md:text-base"
						/>
					</label>
				{/if}
				<button type="submit" class="btn-tactile btn-primary !h-[30px]" disabled={confirmIdentity.pending > 0}>
					{confirmIdentity.pending > 0 ? 'Checking…' : 'Confirm'}
				</button>
			</form>
		</div>
	</section>
{:else}
	<p class="text-[12px] font-medium text-[var(--z-soft)] tabular-nums">Password confirmed · {countdown} left</p>
{/if}
