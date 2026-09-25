<script lang="ts">
	import { messageOf } from '#lib/errors';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import OneTimeSecret from '#lib/components/settings/OneTimeSecret.svelte';
	import ConfirmIdentity from '#lib/components/settings/ConfirmIdentity.svelte';
	import { whoami } from '../../../session.remote';
	import { securityOverview, createCredentialForm, revokeCredentialCommand } from '../../../security.remote';
	import type { CredentialSummary, CredentialType } from '@zaur/server-auth';

	const who = whoami();
	const overviewResource = $derived(who.current ? securityOverview() : undefined);
	const overview = $derived(overviewResource?.current ?? null);

	let status = $state<{ text: string; error?: boolean } | null>(null);
	let locked = $state(true);
	let busy = $state<string | null>(null);

	const appPasswordForm = createCredentialForm.for('AppPassword');
	const apiKeyForm = createCredentialForm.for('ApiKey');
	let shownSecret = $state<{ kind: CredentialType; description: string; secret: string } | null>(null);
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

	function whenDate(iso: string | null): string {
		if (!iso) return '';
		const at = new Date(iso);
		return Number.isNaN(at.getTime()) ? '' : at.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	}

	const groups = $derived(
		overview
			? [
					{
						kind: 'AppPassword' as CredentialType,
						form: appPasswordForm,
						title: 'App passwords',
						items: overview.appPasswords,
						placeholder: 'Thunderbird on the laptop',
						foot: 'For mail apps that sign in with a password of their own — Thunderbird, a phone, a printer. Each can be revoked on its own.'
					},
					{
						kind: 'ApiKey' as CredentialType,
						form: apiKeyForm,
						title: 'API keys',
						items: overview.apiKeys,
						placeholder: 'Backup script',
						foot: 'For scripts and automation talking to the server directly. A key cannot change the password or manage credentials.'
					}
				]
			: []
	);
</script>

<StatusNote {status} />

{#if overviewResource?.error}
	<section class="z-card p-4 text-[13px] text-[var(--z-ch-discard-ink)]">
		Could not load your credentials.
		<button type="button" class="btn-tactile ml-2 !h-[28px]" onclick={() => overviewResource?.refresh()}>Retry</button>
	</section>
{:else if !overview}
	<section class="z-card z-skeleton h-[160px]" aria-hidden="true"></section>
{:else}
	<ConfirmIdentity verifiedUntil={overview.verifiedUntil} totpEnabled={overview.totpEnabled} bind:locked onStatus={(next) => (status = next)} />

	{#each groups as group (group.kind)}
		<section class="z-card">
			<h2 class="z-card-head">{group.title}</h2>
			{#if group.items.length}
				<ul class="divide-y divide-[var(--z-hairline)] border-t border-[var(--z-hairline)]" role="list">
					{#each group.items as item (item.id)}
						<li class="flex items-center justify-between gap-3 px-4 py-2.5">
							<div class="min-w-0">
								<div class="truncate text-[13.5px] font-medium text-[var(--z-body)]">{item.description || 'Unnamed'}</div>
								<div class="text-[12px] text-[var(--z-faint)]">
									{#if item.createdAt}Created {whenDate(item.createdAt)}{/if}
									{#if item.expiresAt} · Expires {whenDate(item.expiresAt)}{/if}
									{#if item.allowedIps.length} · {item.allowedIps.join(', ')}{/if}
								</div>
							</div>
							<button type="button" class="btn-tactile btn-danger !h-[28px] shrink-0" disabled={locked || busy === item.id} onclick={() => revoke(group.kind, item)}>
								{busy === item.id ? 'Revoking…' : 'Revoke'}
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="z-card-body">
				{#if shownSecret?.kind === group.kind}
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
					class="flex flex-wrap items-end gap-2"
				>
					<fieldset disabled={locked || Boolean(overview.serverError)} class="contents">
						<input {...group.form.fields.kind.as('hidden', group.kind)} />
						<label class="min-w-0 flex-1 basis-[180px]">
							<span class="block text-[12px] text-[var(--z-soft)]">New {group.kind === 'ApiKey' ? 'key' : 'password'} for</span>
							<input {...group.form.fields.description.as('text')} required maxlength="100" placeholder={group.placeholder} class="z-field mt-1 w-full max-md:text-base" />
						</label>
						<label class="basis-[120px]">
							<span class="block text-[12px] text-[var(--z-soft)]">Expires</span>
							<select {...group.form.fields.expiresInDays.as('select')} class="z-field mt-1 w-full">
								<option value="">Never</option>
								<option value="30">30 days</option>
								<option value="90">90 days</option>
								<option value="365">1 year</option>
							</select>
						</label>
						<label class="min-w-0 flex-1 basis-[180px]">
							<span class="block text-[12px] text-[var(--z-soft)]">Allowed from (optional)</span>
							<input {...group.form.fields.allowedIps.as('text')} placeholder="203.0.113.0/24" class="z-field mt-1 w-full max-md:text-base" />
						</label>
						<button type="submit" class="btn-tactile !h-[30px]" disabled={group.form.pending > 0}>
							{group.form.pending > 0 ? 'Creating…' : 'Create'}
						</button>
					</fieldset>
				</form>
			</div>
			<p class="z-card-foot">{group.foot}</p>
		</section>
	{/each}
{/if}
