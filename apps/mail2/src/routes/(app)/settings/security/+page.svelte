<script lang="ts">
	import { goto } from '$app/navigation';
	import { QrCode } from '@ark-ui/svelte/qr-code';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import OneTimeSecret from '#lib/components/settings/OneTimeSecret.svelte';
	import { describeUserAgent, relativeTime } from '#lib/settings/devices';
	import { whoami } from '../../../session.remote';
	import {
		securityOverview,
		confirmIdentity,
		changePassword,
		beginTotpSetup,
		confirmTotp,
		disableTotp,
		createCredentialForm,
		revokeCredentialCommand,
		revokeSession,
		revokeOtherSessions,
		saveRecoveryEmail,
		type SessionDTO,
		type TotpSetup
	} from '../../../security.remote';
	import type { CredentialSummary, CredentialType } from '@zaur/server-auth';

	const session = $derived(whoami()?.current ?? null);
	const overviewResource = $derived(session ? securityOverview() : undefined);
	const overview = $derived(overviewResource?.current ?? null);

	let status = $state<{ text: string; error?: boolean } | null>(null);
	let busy = $state<string | null>(null);

	/* ── Identity window ──────────────────────────────────────────────── */

	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});
	const verifiedFor = $derived(
		overview?.verifiedUntil ? Math.max(0, overview.verifiedUntil - now) : 0
	);
	const verified = $derived(verifiedFor > 0);
	const locked = $derived(!verified);
	const countdown = $derived.by(() => {
		const seconds = Math.ceil(verifiedFor / 1000);
		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	});

	// The window expiring, or a proof landing, changes what the server reports.
	$effect(() => {
		if (overview?.verifiedUntil && overview.verifiedUntil <= now) void overviewResource?.refresh();
	});

	const identityResult = $derived(confirmIdentity.result);
	const identityNeedsTotp = $derived(
		identityResult?.ok === false && identityResult.requiresTotp === true
	);
	const showTotpField = $derived(Boolean(overview?.totpEnabled) || identityNeedsTotp);

	// Every form reports through the same note at the top of the page.
	const forms = [confirmIdentity, changePassword, confirmTotp, disableTotp, saveRecoveryEmail];
	for (const form of forms) {
		$effect(() => {
			const result = form.result;
			if (!result) return;
			status = result.ok
				? result.message
					? { text: result.message }
					: null
				: { text: result.error, error: true };
		});
	}

	/* ── Two-factor ───────────────────────────────────────────────────── */

	let totpSetup = $state<TotpSetup | null>(null);
	$effect(() => {
		// A successful confirm (or the setup expiring server-side) ends the setup view.
		if (confirmTotp.result?.ok) totpSetup = null;
	});
	async function startTotp() {
		busy = 'totp';
		status = null;
		try {
			totpSetup = await beginTotpSetup();
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not start the setup'), error: true };
		} finally {
			busy = null;
		}
	}

	/* ── Credentials ──────────────────────────────────────────────────── */

	const appPasswordForm = createCredentialForm.for('AppPassword');
	const apiKeyForm = createCredentialForm.for('ApiKey');
	let shownSecret = $state<{ kind: CredentialType; description: string; secret: string } | null>(
		null
	);
	for (const form of [appPasswordForm, apiKeyForm]) {
		$effect(() => {
			const result = form.result;
			if (!result) return;
			if (result.ok && result.credential) {
				shownSecret = result.credential;
				status = null;
			} else if (!result.ok) {
				status = { text: result.error, error: true };
			}
		});
	}

	async function revoke(kind: CredentialType, item: CredentialSummary) {
		const noun = kind === 'ApiKey' ? 'API key' : 'app password';
		if (!confirm(`Revoke the ${noun} “${item.description || item.id}”? Anything using it stops working now.`)) return;
		busy = item.id;
		status = null;
		try {
			await revokeCredentialCommand({ kind, id: item.id });
			status = { text: `${kind === 'ApiKey' ? 'API key' : 'App password'} revoked` };
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not revoke it'), error: true };
		} finally {
			busy = null;
		}
	}

	/* ── Sessions ─────────────────────────────────────────────────────── */

	const sessions = $derived(
		[...(overview?.sessions ?? [])].sort(
			(a, b) => Number(b.current) - Number(a.current) || b.lastSeenAt - a.lastSeenAt
		)
	);
	const otherSessions = $derived(sessions.filter((item) => !item.current));

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

	function messageOf(cause: unknown, fallback: string): string {
		if (cause && typeof cause === 'object' && 'body' in cause) {
			const body = (cause as { body?: { message?: string } }).body;
			if (body?.message) return body.message;
		}
		return cause instanceof Error && cause.message ? cause.message : fallback;
	}

	function whenDate(iso: string | null): string {
		if (!iso) return '';
		const at = new Date(iso);
		return Number.isNaN(at.getTime())
			? ''
			: at.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<svelte:head><title>Security · Zaur Mail</title></svelte:head>

<StatusNote {status} />

{#if overviewResource?.error}
	<section class="rounded-[10px] border border-[#ef4444] bg-[#fee2e2] p-5 text-[13px] text-[#b91c1c]">
		Could not load your security settings.
		<button type="button" class="btn-tactile ml-2 !h-[28px]" onclick={() => overviewResource?.refresh()}>
			Retry
		</button>
	</section>
{:else if !overview}
	<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-[18px] text-[13px] text-[#94a3b8]">Loading…</section>
{:else}
	{#if overview.serverError}
		<section class="z-railed rounded-[10px] border border-[#d97706] bg-[#fde68a] p-4 text-[13px] text-[#334155]" style:--z-rail="#d97706">
			{overview.serverError} Signed-in devices can still be managed below.
		</section>
	{/if}

	<!-- Confirm identity -->
	<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-[18px] shadow-[var(--z-shadow-tactile)] max-md:p-4">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="z-caption">Confirm it's you</h2>
			{#if verified}
				<span class="text-[12px] font-medium text-[#64748b] tabular-nums">Confirmed · {countdown} left</span>
			{/if}
		</div>
		<p class="mt-1.5 text-[12.5px] leading-relaxed text-[#64748b]">
			Creating app passwords and signing out devices needs your password again, recently. The
			password and two-factor forms ask for it themselves.
		</p>
		{#if !verified}
			<form {...confirmIdentity} class="mt-3 flex flex-wrap items-end gap-2">
				<label class="min-w-0 flex-1 basis-[200px]">
					<span class="block text-[12px] text-[#64748b]">Password</span>
					<input
						{...confirmIdentity.fields._password.as('password')}
						autocomplete="current-password"
						required
						class="z-field mt-1 w-full max-md:text-base"
					/>
				</label>
				{#if showTotpField}
					<label class="basis-[140px]">
						<span class="block text-[12px] text-[#64748b]">Code</span>
						<input
							{...confirmIdentity.fields.totp.as('text')}
							inputmode="numeric"
							autocomplete="one-time-code"
							placeholder="123456"
							class="z-field mt-1 w-full font-mono tracking-[0.2em] max-md:text-base"
						/>
					</label>
				{/if}
				<button type="submit" class="btn-tactile !h-[30px] btn-primary" disabled={confirmIdentity.pending > 0}>
					{confirmIdentity.pending > 0 ? 'Checking…' : 'Confirm'}
				</button>
			</form>
		{/if}
	</section>

	<!-- Password -->
	<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-[18px] shadow-[var(--z-shadow-tactile)] max-md:p-4">
		<h2 class="z-caption">Password</h2>
		<p class="mt-1.5 text-[12.5px] leading-relaxed text-[#64748b]">
			Changing it signs every other browser out; app passwords keep working until you revoke
			them. This device stays signed in.
		</p>
		<form {...changePassword} class="mt-3 flex flex-col gap-3">
			<fieldset disabled={Boolean(overview.serverError)} class="contents">
				<label class="block">
					<span class="block text-[12px] text-[#64748b]">Current password</span>
					<input {...changePassword.fields._current.as('password')} autocomplete="current-password" required class="z-field mt-1 w-full max-md:text-base" />
				</label>
				<div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
					<label class="block">
						<span class="block text-[12px] text-[#64748b]">New password</span>
						<input {...changePassword.fields._next.as('password')} autocomplete="new-password" required minlength="8" class="z-field mt-1 w-full max-md:text-base" />
					</label>
					<label class="block">
						<span class="block text-[12px] text-[#64748b]">Repeat new password</span>
						<input {...changePassword.fields._confirm.as('password')} autocomplete="new-password" required class="z-field mt-1 w-full max-md:text-base" />
					</label>
				</div>
				{#if overview.totpEnabled}
					<label class="block max-w-[200px]">
						<span class="block text-[12px] text-[#64748b]">Authentication code</span>
						<input {...changePassword.fields.totp.as('text')} inputmode="numeric" autocomplete="one-time-code" placeholder="123456" class="z-field mt-1 w-full font-mono tracking-[0.2em] max-md:text-base" />
					</label>
				{/if}
				{#each changePassword.fields.allIssues() ?? [] as issue (issue.message)}
					<p class="text-[12.5px] text-[#b91c1c]">{issue.message}</p>
				{/each}
				<div>
					<button type="submit" class="btn-tactile" disabled={changePassword.pending > 0}>
						{changePassword.pending > 0 ? 'Changing…' : 'Change password'}
					</button>
				</div>
			</fieldset>
		</form>
	</section>

	<!-- Two-factor -->
	<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-[18px] shadow-[var(--z-shadow-tactile)] max-md:p-4">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="z-caption">Two-factor authentication</h2>
			<span class="rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold {overview.totpEnabled ? 'bg-[#dcfce7] text-[#14532d]' : 'bg-[#f1f5f9] text-[#64748b]'}">
				{overview.totpEnabled ? 'On' : 'Off'}
			</span>
		</div>
		<p class="mt-1.5 text-[12.5px] leading-relaxed text-[#64748b]">
			A six-digit code from an authenticator app, asked for at every sign-in. Mail apps that
			cannot ask for one use an app password instead.
		</p>
		{#if overview.authMethod !== 'oauth'}
			<p class="mt-3 text-[12.5px] text-[#78350f]">
				This session signed in with the password fallback, which cannot carry a code from
				request to request. Sign in through the secure sign-in to manage two-factor authentication.
			</p>
		{:else if overview.totpEnabled}
			<form {...disableTotp} class="mt-3 flex flex-wrap items-end gap-2">
				<fieldset disabled={locked} class="contents">
					<label class="min-w-0 flex-1 basis-[200px]">
						<span class="block text-[12px] text-[#64748b]">Password</span>
						<input {...disableTotp.fields._password.as('password')} autocomplete="current-password" required class="z-field mt-1 w-full max-md:text-base" />
					</label>
					<label class="basis-[140px]">
						<span class="block text-[12px] text-[#64748b]">Current code</span>
						<input {...disableTotp.fields.code.as('text')} inputmode="numeric" autocomplete="one-time-code" required placeholder="123456" class="z-field mt-1 w-full font-mono tracking-[0.2em] max-md:text-base" />
					</label>
					<button type="submit" class="btn-tactile !h-[30px] !text-[#b91c1c]" disabled={disableTotp.pending > 0}>
						{disableTotp.pending > 0 ? 'Turning off…' : 'Turn off'}
					</button>
				</fieldset>
			</form>
			{#if locked}<p class="mt-2 text-[12px] text-[#94a3b8]">Confirm your password above first.</p>{/if}
		{:else if totpSetup}
			<div class="mt-3 flex flex-wrap gap-5">
				<QrCode.Root value={totpSetup.uri} encoding={{ ecc: 'M' }} class="shrink-0 rounded-[8px] border border-[#e2e8f0] bg-white p-2">
					<QrCode.Frame class="size-[168px]">
						<QrCode.Pattern class="fill-[#0b1220]" />
					</QrCode.Frame>
				</QrCode.Root>
				<div class="min-w-0 flex-1 basis-[240px]">
					<ol class="list-decimal space-y-1 pl-4 text-[12.5px] leading-relaxed text-[#475569]">
						<li>Scan the code with your authenticator app, or enter the key by hand:</li>
					</ol>
					<code class="mt-1.5 block select-all rounded-[6px] border border-[#cbd5e1] bg-[#f8fafc] px-2.5 py-1.5 font-mono text-[12px] break-all text-[#0b1220]">{totpSetup.secret}</code>
					<form {...confirmTotp} class="mt-3 flex flex-col gap-2">
						<label class="block">
							<span class="block text-[12px] text-[#64748b]">Password</span>
							<input {...confirmTotp.fields._password.as('password')} autocomplete="current-password" required class="z-field mt-1 w-full max-md:text-base" />
						</label>
						<label class="block max-w-[200px]">
							<span class="block text-[12px] text-[#64748b]">Code from the app</span>
							<input {...confirmTotp.fields.code.as('text')} inputmode="numeric" autocomplete="one-time-code" required placeholder="123456" class="z-field mt-1 w-full font-mono tracking-[0.2em] max-md:text-base" />
						</label>
						<div class="flex gap-2">
							<button type="submit" class="btn-tactile btn-primary" disabled={confirmTotp.pending > 0}>
								{confirmTotp.pending > 0 ? 'Enabling…' : 'Enable'}
							</button>
							<button type="button" class="btn-tactile" onclick={() => (totpSetup = null)}>Cancel</button>
						</div>
					</form>
				</div>
			</div>
		{:else}
			<button type="button" class="btn-tactile mt-3" disabled={locked || busy === 'totp'} onclick={startTotp}>
				{busy === 'totp' ? 'Preparing…' : 'Set up'}
			</button>
			{#if locked}<p class="mt-2 text-[12px] text-[#94a3b8]">Confirm your password above first.</p>{/if}
		{/if}
	</section>

	<!-- App passwords / API keys -->
	{#each [{ kind: 'AppPassword', form: appPasswordForm, title: 'App passwords', items: overview.appPasswords, blurb: 'For mail apps that sign in with a password of their own — Thunderbird, a phone, a printer. Each one can be revoked on its own.' }, { kind: 'ApiKey', form: apiKeyForm, title: 'API keys', items: overview.apiKeys, blurb: 'For scripts and automation talking to the server directly. A key cannot change the password or manage credentials.' }] as group (group.kind)}
		{@const kind = group.kind as CredentialType}
		<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-[18px] shadow-[var(--z-shadow-tactile)] max-md:p-4">
			<h2 class="z-caption">{group.title}</h2>
			<p class="mt-1.5 text-[12.5px] leading-relaxed text-[#64748b]">{group.blurb}</p>

			{#if group.items.length}
				<ul class="mt-3 divide-y divide-[#f1f5f9]" role="list">
					{#each group.items as item (item.id)}
						<li class="flex items-center justify-between gap-3 py-2">
							<div class="min-w-0">
								<div class="truncate text-[13px] font-medium text-[#1e293b]">{item.description || 'Unnamed'}</div>
								<div class="text-[12px] text-[#94a3b8]">
									{#if item.createdAt}Created {whenDate(item.createdAt)}{/if}
									{#if item.expiresAt} · Expires {whenDate(item.expiresAt)}{/if}
									{#if item.allowedIps.length} · {item.allowedIps.join(', ')}{/if}
								</div>
							</div>
							<button type="button" class="btn-tactile !h-[28px] shrink-0 !text-[#b91c1c]" disabled={locked || busy === item.id} onclick={() => revoke(kind, item)}>
								{busy === item.id ? 'Revoking…' : 'Revoke'}
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-[12.5px] text-[#94a3b8]">None yet.</p>
			{/if}

			{#if shownSecret?.kind === kind}
				<OneTimeSecret
					label="{group.title.slice(0, -1)} for “{shownSecret.description}”"
					secret={shownSecret.secret}
					hint="Copy it now — it is shown once and cannot be recovered later."
					onDismiss={() => (shownSecret = null)}
				/>
			{/if}

			<form
				{...group.form.enhance(async (form) => {
					await form.submit();
					if (form.result?.ok) form.element.reset();
				})}
				class="mt-4 flex flex-wrap items-end gap-2"
			>
				<fieldset disabled={locked || Boolean(overview.serverError)} class="contents">
					<input {...group.form.fields.kind.as('hidden', kind)} />
					<label class="min-w-0 flex-1 basis-[180px]">
						<span class="block text-[12px] text-[#64748b]">Name</span>
						<input {...group.form.fields.description.as('text')} required maxlength="100" placeholder={kind === 'ApiKey' ? 'Backup script' : 'Thunderbird on the laptop'} class="z-field mt-1 w-full max-md:text-base" />
					</label>
					<label class="basis-[120px]">
						<span class="block text-[12px] text-[#64748b]">Expires</span>
						<select {...group.form.fields.expiresInDays.as('select')} class="z-field mt-1 w-full">
							<option value="">Never</option>
							<option value="30">30 days</option>
							<option value="90">90 days</option>
							<option value="365">1 year</option>
						</select>
					</label>
					<label class="min-w-0 flex-1 basis-[180px]">
						<span class="block text-[12px] text-[#64748b]">Allowed from (optional)</span>
						<input {...group.form.fields.allowedIps.as('text')} placeholder="203.0.113.0/24" class="z-field mt-1 w-full max-md:text-base" />
					</label>
					<button type="submit" class="btn-tactile !h-[30px]" disabled={group.form.pending > 0}>
						{group.form.pending > 0 ? 'Creating…' : 'Create'}
					</button>
				</fieldset>
			</form>
			{#if locked}<p class="mt-2 text-[12px] text-[#94a3b8]">Confirm your password above first.</p>{/if}
		</section>
	{/each}

	<!-- Sessions -->
	<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-[18px] shadow-[var(--z-shadow-tactile)] max-md:p-4">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="z-caption">Signed-in devices</h2>
			{#if otherSessions.length}
				<button type="button" class="btn-tactile !h-[28px] !text-[#b91c1c]" disabled={locked || busy === 'others'} onclick={signOutOthers}>
					{busy === 'others' ? 'Signing out…' : 'Sign out others'}
				</button>
			{/if}
		</div>
		<p class="mt-1.5 text-[12.5px] leading-relaxed text-[#64748b]">
			Browsers signed into this account through Zaur Mail (1.0 and 2.0 share these). Mail apps
			with app passwords are not sessions — revoke the password above.
		</p>
		<ul class="mt-3 divide-y divide-[#f1f5f9]" role="list">
			{#each sessions as item (item.id)}
				<li class="flex items-center justify-between gap-3 py-2">
					<div class="min-w-0">
						<div class="flex items-center gap-2 text-[13px] font-medium text-[#1e293b]">
							<span class="truncate">{describeUserAgent(item.userAgent)}</span>
							{#if item.current}
								<span class="z-chip !normal-case !tracking-normal" style="--z-stroke:#3b82f6;--z-ink-on:#1e40af">This device</span>
							{/if}
						</div>
						<div class="text-[12px] text-[#94a3b8]">
							Active {relativeTime(item.lastSeenAt, now)} · signed in {relativeTime(item.createdAt, now)}
						</div>
					</div>
					<button type="button" class="btn-tactile !h-[28px] shrink-0" disabled={locked || busy === item.id} onclick={() => signOutSession(item)}>
						{busy === item.id ? '…' : 'Sign out'}
					</button>
				</li>
			{/each}
		</ul>
		{#if locked}<p class="mt-2 text-[12px] text-[#94a3b8]">Confirm your password above first.</p>{/if}
	</section>

	<!-- Recovery email -->
	{#if overview.recovery.available}
		<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-[18px] shadow-[var(--z-shadow-tactile)] max-md:p-4">
			<h2 class="z-caption">Recovery email</h2>
			<p class="mt-1.5 text-[12.5px] leading-relaxed text-[#64748b]">
				Where a password reset link goes. A new address has to confirm before it counts.
			</p>
			<form {...saveRecoveryEmail} class="mt-3 flex flex-wrap items-end gap-2">
				<fieldset disabled={locked} class="contents">
					<label class="min-w-0 flex-1 basis-[240px]">
						<span class="block text-[12px] text-[#64748b]">Address</span>
						<input {...saveRecoveryEmail.fields.recoveryEmail.as('email', overview.recovery.email ?? '')} required class="z-field mt-1 w-full max-md:text-base" />
					</label>
					<button type="submit" class="btn-tactile !h-[30px]" disabled={saveRecoveryEmail.pending > 0}>
						{saveRecoveryEmail.pending > 0 ? 'Saving…' : 'Save'}
					</button>
				</fieldset>
			</form>
			{#if locked}<p class="mt-2 text-[12px] text-[#94a3b8]">Confirm your password above first.</p>{/if}
		</section>
	{/if}
{/if}
