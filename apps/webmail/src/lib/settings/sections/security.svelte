<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsFormGroup from '$lib/components/settings/SettingsFormGroup.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { confirm } from '$lib/stores/confirm.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	type Credential = {
		id: string;
		description?: string;
		createdAt?: string;
		expiresAt?: string | null;
	};
	type BrowserSession = {
		id: string;
		current: boolean;
		createdAt: number;
		lastSeenAt: number;
		userAgent?: string | null;
	};
	type Overview = {
		totpEnabled: boolean;
		appPasswords: Credential[];
		apiKeys: Credential[];
		sessions: BrowserSession[];
	};

	let overview = $state<Overview | null>(null);
	let recoveryEmail = $state<string | null>(null);
	let loading = $state(true);
	let busy = $state(false);
	let verified = $state(false);
	let reauthPassword = $state('');
	let reauthTotp = $state('');
	let reauthNeedsTotp = $state(false);
	let newPassword = $state('');
	let confirmPassword = $state('');
	let recoveryInput = $state('');
	let credentialDescription = $state('');
	let apiKeyDescription = $state('');
	let oneTimeSecret = $state<{ title: string; value: string } | null>(null);
	let totpSetup = $state<{ secret: string; uri: string; qr?: string } | null>(null);
	let totpCode = $state('');

	async function api(path: string, method = 'GET', body?: unknown) {
		const response = await fetch(path, {
			method,
			headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
			body: body !== undefined ? JSON.stringify(body) : undefined
		});
		const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
		if (response.status === 428) {
			verified = false;
			throw new Error('Confirm your password first.');
		}
		if (!response.ok) throw new Error(String(payload.error || 'Request failed'));
		return payload;
	}

	async function load() {
		loading = true;
		try {
			overview = (await api('/api/account/security')) as unknown as Overview;
			const recovery = await api('/api/account/security/recovery');
			recoveryEmail = (recovery.recoveryEmail as string | null) ?? null;
			recoveryInput = recoveryEmail ?? '';
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not load security settings', 'error');
		} finally {
			loading = false;
		}
	}

	async function reauthenticate() {
		if (!reauthPassword) return;
		busy = true;
		try {
			const result = await api('/api/auth/reauth', 'POST', {
				password: reauthPassword,
				totp: reauthTotp || undefined
			});
			if (result.requiresTotp) {
				reauthNeedsTotp = true;
				return;
			}
			verified = true;
			reauthNeedsTotp = false;
			toast.show('Identity confirmed for five minutes.', 'success');
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not confirm identity', 'error');
		} finally {
			busy = false;
		}
	}

	async function changePassword() {
		if (newPassword !== confirmPassword) {
			toast.show('The new passwords do not match.', 'error');
			return;
		}
		busy = true;
		try {
			await api('/api/account/security/password', 'POST', {
				currentPassword: reauthPassword,
				newPassword,
				totp: reauthTotp || undefined
			});
			reauthPassword = newPassword;
			newPassword = '';
			confirmPassword = '';
			toast.show('Password changed. Other mail sessions have been revoked.', 'success');
			await load();
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Password change failed', 'error');
		} finally {
			busy = false;
		}
	}

	async function startTotp() {
		busy = true;
		try {
			const setup = await api('/api/account/security/totp/setup', 'POST', {});
			const { toDataURL } = await import('qrcode');
			totpSetup = {
				secret: String(setup.secret),
				uri: String(setup.uri),
				qr: await toDataURL(String(setup.uri), { width: 220, margin: 1 })
			};
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not start setup', 'error');
		} finally {
			busy = false;
		}
	}

	async function confirmTotp() {
		busy = true;
		try {
			await api('/api/account/security/totp/confirm', 'POST', {
				currentPassword: reauthPassword,
				code: totpCode
			});
			reauthTotp = totpCode;
			totpCode = '';
			totpSetup = null;
			toast.show('Two-factor authentication enabled.', 'success');
			await load();
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Code could not be verified', 'error');
		} finally {
			busy = false;
		}
	}

	async function removeTotp() {
		if (
			!(await confirm.ask({
				title: 'Disable two-factor authentication?',
				description: 'Your password alone will be enough to sign in.',
				confirmLabel: 'Disable',
				tone: 'danger'
			}))
		) return;
		busy = true;
		try {
			await api('/api/account/security/totp', 'DELETE', {
				currentPassword: reauthPassword,
				code: reauthTotp
			});
			reauthTotp = '';
			toast.show('Two-factor authentication disabled.', 'success');
			await load();
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not disable 2FA', 'error');
		} finally {
			busy = false;
		}
	}

	async function createCredential(kind: 'app-passwords' | 'api-keys') {
		const description = kind === 'app-passwords' ? credentialDescription : apiKeyDescription;
		busy = true;
		try {
			const result = await api(`/api/account/security/${kind}`, 'POST', { description });
			const credential = result.credential as { secret: string };
			oneTimeSecret = {
				title: kind === 'app-passwords' ? 'App password' : 'API key',
				value: credential.secret
			};
			if (kind === 'app-passwords') credentialDescription = '';
			else apiKeyDescription = '';
			await load();
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not create credential', 'error');
		} finally {
			busy = false;
		}
	}

	async function revokeCredential(kind: 'app-passwords' | 'api-keys', item: Credential) {
		if (
			!(await confirm.ask({
				title: `Revoke ${item.description || 'credential'}?`,
				description: 'Applications using it will stop working immediately.',
				confirmLabel: 'Revoke',
				tone: 'danger'
			}))
		) return;
		try {
			await api(`/api/account/security/${kind}/${encodeURIComponent(item.id)}`, 'DELETE', {});
			await load();
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not revoke credential', 'error');
		}
	}

	async function saveRecovery() {
		busy = true;
		try {
			await api('/api/account/security/recovery', 'POST', { recoveryEmail: recoveryInput });
			toast.show('Check the new address for a verification link.', 'success');
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not change recovery email', 'error');
		} finally {
			busy = false;
		}
	}

	async function revokeSession(session: BrowserSession) {
		if (!await confirm.ask({
			title: session.current ? 'Sign out this session?' : 'Sign out that session?',
			description: session.current
				? 'You will return to the sign-in screen.'
				: 'That browser will lose access to this account only.',
			confirmLabel: 'Sign out',
			tone: 'danger'
		})) return;
		await api(`/api/account/security/sessions/${encodeURIComponent(session.id)}`, 'DELETE', {});
		if (session.current) location.href = '/login';
		else await load();
	}

	onMount(() => void load());
</script>

{#if loading}
	<p class="p-4 text-sm text-fg-muted">Loading security settings…</p>
{:else if !overview}
	<p class="p-4 text-sm text-danger">Security settings are currently unavailable.</p>
{:else}
	<SettingsFormGroup
		title="Confirm your identity"
		description="Sensitive changes require your password again. Confirmation lasts five minutes."
	>
		<SettingsField title="Password">
			{#snippet children({ id })}
				<input id={id} class="z-input" type="password" autocomplete="current-password" bind:value={reauthPassword} />
			{/snippet}
		</SettingsField>
		{#if reauthNeedsTotp || overview.totpEnabled}
			<SettingsField title="Authentication code">
				{#snippet children({ id })}
					<input id={id} class="z-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" bind:value={reauthTotp} />
				{/snippet}
			</SettingsField>
		{/if}
		<SettingsRow kind="action" title={verified ? 'Identity confirmed' : 'Confirmation required'}>
			<Button onclick={() => void reauthenticate()} disabled={busy || !reauthPassword}>
				{verified ? 'Confirm again' : 'Confirm'}
			</Button>
		</SettingsRow>
	</SettingsFormGroup>

	<SettingsFormGroup title="Password" description="Use a unique password you do not use elsewhere.">
		<SettingsField title="New password">
			{#snippet children({ id })}
				<input id={id} class="z-input" type="password" autocomplete="new-password" bind:value={newPassword} disabled={!verified} />
			{/snippet}
		</SettingsField>
		<SettingsField title="Confirm new password">
			{#snippet children({ id })}
				<input id={id} class="z-input" type="password" autocomplete="new-password" bind:value={confirmPassword} disabled={!verified} />
			{/snippet}
		</SettingsField>
		<SettingsRow kind="action" title="Change password" description="Changing it revokes OAuth tokens on other devices.">
			<Button onclick={() => void changePassword()} disabled={busy || !verified || newPassword.length < 8}>Change</Button>
		</SettingsRow>
	</SettingsFormGroup>

	<SettingsGroup title="Two-factor authentication">
		<SettingsRow
			kind="action"
			title={overview.totpEnabled ? 'Authenticator app enabled' : 'Authenticator app'}
			description={overview.totpEnabled ? 'A code is required when you sign in.' : 'Add a second step to protect your mailbox.'}
		>
			{#if overview.totpEnabled}
				<Button variant="danger" onclick={() => void removeTotp()} disabled={!verified || !reauthTotp}>Disable</Button>
			{:else}
				<Button variant="ghost" onclick={() => void startTotp()} disabled={!verified}>Set up</Button>
			{/if}
		</SettingsRow>
		{#if totpSetup}
			<SettingsRow kind="info" title="Scan this QR code" description="Or enter the manual key in your authenticator app.">
				<div class="flex max-w-[14rem] flex-col items-end gap-2">
					{#if totpSetup.qr}<img src={totpSetup.qr} alt="Authenticator setup QR code" width="180" height="180" />{/if}
					<code class="break-all text-xs">{totpSetup.secret}</code>
					<input class="z-input" inputmode="numeric" maxlength="6" placeholder="Six-digit code" bind:value={totpCode} />
					<Button onclick={() => void confirmTotp()} disabled={!/^\d{6}$/.test(totpCode)}>Enable</Button>
				</div>
			</SettingsRow>
		{/if}
	</SettingsGroup>

	<SettingsFormGroup title="Recovery email" description="Password-reset messages go to this verified address.">
		<SettingsField title="Recovery address">
			{#snippet children({ id })}
				<input id={id} class="z-input" type="email" autocomplete="email" bind:value={recoveryInput} disabled={!verified} />
			{/snippet}
		</SettingsField>
		<SettingsRow kind="action" title={recoveryEmail ?? 'No recovery email'} description="A verification link is sent before the address changes.">
			<Button onclick={() => void saveRecovery()} disabled={busy || !verified || !recoveryInput}>Verify new address</Button>
		</SettingsRow>
	</SettingsFormGroup>

	<SettingsFormGroup title="App passwords" description="Use these for IMAP, SMTP, and other mail apps.">
		<SettingsField title="New app password name">
			{#snippet children({ id })}
				<input id={id} class="z-input" placeholder="Phone mail app" bind:value={credentialDescription} disabled={!verified} />
			{/snippet}
		</SettingsField>
		<SettingsRow kind="action" title="Create app password">
			<Button onclick={() => void createCredential('app-passwords')} disabled={!verified || !credentialDescription}>Create</Button>
		</SettingsRow>
		{#each overview.appPasswords as item (item.id)}
			<SettingsRow kind="action" searchable={false} title={item.description || 'App password'} description={item.createdAt}>
				<Button variant="danger" onclick={() => void revokeCredential('app-passwords', item)} disabled={!verified}>Revoke</Button>
			</SettingsRow>
		{/each}
	</SettingsFormGroup>

	<SettingsGroup title="ZAUR sessions">
		{#each overview.sessions as session (session.id)}
			<SettingsRow kind="action" searchable={false} title={session.current ? 'This browser' : session.userAgent || 'Browser session'} description={`Last active ${new Date(session.lastSeenAt).toLocaleString()}`}>
				<Button variant={session.current ? 'danger' : 'ghost'} onclick={() => void revokeSession(session)} disabled={!verified}>Sign out</Button>
			</SettingsRow>
		{/each}
		<SettingsRow kind="info" title="OAuth sessions" description="ZAUR can list browser sessions only. Change your password to revoke all OAuth tokens.">
			<span class="text-sm text-fg-muted">Browser sessions only</span>
		</SettingsRow>
	</SettingsGroup>

	<SettingsFormGroup title="Advanced · API keys" description="For scripts and integrations. Store keys securely.">
		<SettingsField title="New API key name">
			{#snippet children({ id })}
				<input id={id} class="z-input" placeholder="Automation" bind:value={apiKeyDescription} disabled={!verified} />
			{/snippet}
		</SettingsField>
		<SettingsRow kind="action" title="Create API key" description="Uses your account's safe inherited permission preset.">
			<Button onclick={() => void createCredential('api-keys')} disabled={!verified || !apiKeyDescription}>Create</Button>
		</SettingsRow>
		{#each overview.apiKeys as item (item.id)}
			<SettingsRow kind="action" searchable={false} title={item.description || 'API key'} description={item.createdAt}>
				<Button variant="danger" onclick={() => void revokeCredential('api-keys', item)} disabled={!verified}>Revoke</Button>
			</SettingsRow>
		{/each}
	</SettingsFormGroup>

	{#if oneTimeSecret}
		<div class="z-callout m-4" role="status">
			<span class="z-callout__title">{oneTimeSecret.title} created</span>
			<p class="z-callout__body">Copy it now. It will not be shown again.</p>
			<code class="my-2 block break-all rounded bg-bg-subtle p-3 text-sm">{oneTimeSecret.value}</code>
			<div class="flex gap-2">
				<Button onclick={() => void navigator.clipboard.writeText(oneTimeSecret!.value)}>Copy</Button>
				<Button variant="ghost" onclick={() => oneTimeSecret = null}>Done</Button>
			</div>
		</div>
	{/if}
{/if}
