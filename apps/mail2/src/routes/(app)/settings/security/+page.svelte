<script lang="ts">
	import { messageOf } from '#lib/errors';
	import { QrCode } from '@ark-ui/svelte/qr-code';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import ConfirmIdentity from '#lib/components/settings/ConfirmIdentity.svelte';
	import { CHANNELS, channelStyle } from '#lib/mail/colors';
	import { whoami } from '../../../session.remote';
	import {
		securityOverview,
		changePassword,
		beginTotpSetup,
		confirmTotp,
		disableTotp,
		saveRecoveryEmail,
		type TotpSetup
	} from '../../../security.remote';

	const who = whoami();
	const overviewResource = $derived(who.current ? securityOverview() : undefined);
	const overview = $derived(overviewResource?.current ?? null);

	let status = $state<{ text: string; error?: boolean } | null>(null);
	let locked = $state(true);
	let busy = $state(false);

	// Every form reports through the same note at the top of the page.
	for (const form of [changePassword, confirmTotp, disableTotp, saveRecoveryEmail]) {
		$effect(() => {
			const result = form.result;
			if (!result) return;
			status = result.ok ? (result.message ? { text: result.message } : null) : { text: result.error, error: true };
		});
	}

	let totpSetup = $state<TotpSetup | null>(null);
	$effect(() => {
		// A successful confirm ends the setup view.
		if (confirmTotp.result?.ok) totpSetup = null;
	});
	async function startTotp() {
		busy = true;
		status = null;
		try {
			totpSetup = await beginTotpSetup();
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not start the setup'), error: true };
		} finally {
			busy = false;
		}
	}

	const blurb = 'text-[12.5px] leading-[1.6] text-[var(--z-muted)]';
	const fieldLabel = 'block text-[12px] text-[var(--z-soft)]';
	const codeField = 'z-field mt-1 w-full font-mono tracking-[0.2em] max-md:text-base';
</script>

<StatusNote {status} />

{#if overviewResource?.error}
	<section class="z-card p-4 text-[13px] text-[var(--z-ch-discard-ink)]">
		Could not load your security settings.
		<button type="button" class="btn-tactile ml-2 !h-[28px]" onclick={() => overviewResource?.refresh()}>Retry</button>
	</section>
{:else if !overview}
	<section class="z-card z-skeleton h-[160px]" aria-hidden="true"></section>
{:else}
	{#if overview.serverError}
		<section class="z-railed rounded-[10px] border border-[var(--z-ch-needs-solid)] bg-[var(--z-ch-needs-fill)] p-4 text-[13px] text-[var(--z-strong)]" style:--z-rail="var(--z-ch-needs-solid)">
			{overview.serverError}
		</section>
	{/if}

	<!-- Password: asks for the current one itself, so it works without the window. -->
	<section class="z-card">
		<h2 class="z-card-head">Password</h2>
		<form {...changePassword} class="z-card-body flex flex-col gap-3">
			<fieldset disabled={Boolean(overview.serverError)} class="contents">
				<label class="block">
					<span class={fieldLabel}>Current password</span>
					<input {...changePassword.fields._current.as('password')} autocomplete="current-password" required class="z-field mt-1 w-full max-md:text-base" />
				</label>
				<div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
					<label class="block">
						<span class={fieldLabel}>New password</span>
						<input {...changePassword.fields._next.as('password')} autocomplete="new-password" required minlength="8" class="z-field mt-1 w-full max-md:text-base" />
					</label>
					<label class="block">
						<span class={fieldLabel}>Repeat new password</span>
						<input {...changePassword.fields._confirm.as('password')} autocomplete="new-password" required class="z-field mt-1 w-full max-md:text-base" />
					</label>
				</div>
				{#if overview.totpEnabled}
					<label class="block max-w-[200px]">
						<span class={fieldLabel}>Authentication code</span>
						<input {...changePassword.fields.totp.as('text')} inputmode="numeric" autocomplete="one-time-code" placeholder="123456" class={codeField} />
					</label>
				{/if}
				{#each changePassword.fields.allIssues() ?? [] as issue (issue.message)}
					<p class="text-[12.5px] text-[var(--z-ch-discard-ink)]">{issue.message}</p>
				{/each}
				<div>
					<button type="submit" class="btn-tactile" disabled={changePassword.pending > 0}>
						{changePassword.pending > 0 ? 'Changing…' : 'Change password'}
					</button>
				</div>
			</fieldset>
		</form>
		<p class="z-card-foot">Changing it signs every other browser out; app passwords keep working until you revoke them.</p>
	</section>

	<ConfirmIdentity verifiedUntil={overview.verifiedUntil} totpEnabled={overview.totpEnabled} bind:locked onStatus={(next) => (status = next)} />

	<section class="z-card">
		<div class="z-card-head justify-between">
			<h2>Two-factor authentication</h2>
			<span class="z-chip z-chip-filled" style={overview.totpEnabled ? channelStyle(CHANNELS.confirmed) : undefined}>
				{overview.totpEnabled ? 'On' : 'Off'}
			</span>
		</div>
		<div class="z-card-body">
			<p class={blurb}>
				A six-digit code from an authenticator app, asked for at every sign-in. Mail apps that cannot ask for one use an
				app password instead.
			</p>
			{#if overview.authMethod === 'oauth'}
				{#if overview.totpEnabled}
					<form {...disableTotp} class="mt-3 flex flex-wrap items-end gap-2">
						<fieldset disabled={locked} class="contents">
							<label class="min-w-0 flex-1 basis-[200px]">
								<span class={fieldLabel}>Password</span>
								<input {...disableTotp.fields._password.as('password')} autocomplete="current-password" required class="z-field mt-1 w-full max-md:text-base" />
							</label>
							<label class="basis-[140px]">
								<span class={fieldLabel}>Current code</span>
								<input {...disableTotp.fields.code.as('text')} inputmode="numeric" autocomplete="one-time-code" required placeholder="123456" class={codeField} />
							</label>
							<button type="submit" class="btn-tactile btn-danger !h-[30px]" disabled={disableTotp.pending > 0}>
								{disableTotp.pending > 0 ? 'Turning off…' : 'Turn off'}
							</button>
						</fieldset>
					</form>
				{:else if totpSetup}
					<div class="mt-3 flex flex-wrap gap-5">
						<QrCode.Root value={totpSetup.uri} encoding={{ ecc: 'M' }} class="shrink-0 rounded-[8px] border border-[var(--z-hairline)] bg-[var(--z-surface)] p-2">
							<QrCode.Frame class="size-[168px]">
								<QrCode.Pattern class="fill-[var(--z-ink)]" />
							</QrCode.Frame>
						</QrCode.Root>
						<div class="min-w-0 flex-1 basis-[240px]">
							<p class={blurb}>Scan the code with your authenticator app, or enter the key by hand:</p>
							<code class="mt-1.5 block rounded-[6px] border border-[var(--z-line)] bg-[var(--z-hover)] px-2.5 py-1.5 font-mono text-[12px] break-all text-[var(--z-ink)] select-all">{totpSetup.secret}</code>
							<form {...confirmTotp} class="mt-3 flex flex-col gap-2">
								<label class="block">
									<span class={fieldLabel}>Password</span>
									<input {...confirmTotp.fields._password.as('password')} autocomplete="current-password" required class="z-field mt-1 w-full max-md:text-base" />
								</label>
								<label class="block max-w-[200px]">
									<span class={fieldLabel}>Code from the app</span>
									<input {...confirmTotp.fields.code.as('text')} inputmode="numeric" autocomplete="one-time-code" required placeholder="123456" class={codeField} />
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
					<button type="button" class="btn-tactile mt-3" disabled={locked || busy} onclick={startTotp}>
						{busy ? 'Preparing…' : 'Set up'}
					</button>
				{/if}
			{/if}
		</div>
		{#if overview.authMethod !== 'oauth'}
			<p class="z-card-foot text-[var(--z-ch-needs-ink)]">
				This session signed in with the password fallback, which cannot carry a code from request to request. Sign in
				through the secure sign-in to manage two-factor authentication.
			</p>
		{:else if locked && !totpSetup}
			<p class="z-card-foot">Confirm your password above first.</p>
		{/if}
	</section>

	{#if overview.recovery.available}
		<section class="z-card">
			<h2 class="z-card-head">Recovery email</h2>
			<div class="z-card-body">
				<p class={blurb}>Where a password reset link goes. A new address has to confirm before it counts.</p>
				<form {...saveRecoveryEmail} class="mt-3 flex flex-wrap items-end gap-2">
					<fieldset disabled={locked} class="contents">
						<label class="min-w-0 flex-1 basis-[240px]">
							<span class={fieldLabel}>Address</span>
							<input {...saveRecoveryEmail.fields.recoveryEmail.as('email', overview.recovery.email ?? '')} required class="z-field mt-1 w-full max-md:text-base" />
						</label>
						<button type="submit" class="btn-tactile !h-[30px]" disabled={saveRecoveryEmail.pending > 0}>
							{saveRecoveryEmail.pending > 0 ? 'Saving…' : 'Save'}
						</button>
					</fieldset>
				</form>
			</div>
			{#if locked}<p class="z-card-foot">Confirm your password above first.</p>{/if}
		</section>
	{/if}
{/if}
