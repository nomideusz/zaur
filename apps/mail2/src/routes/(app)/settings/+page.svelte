<script lang="ts">
	import { goto } from '$app/navigation';
	import { whoami } from '../../session.remote';
	import { identities, setDisplayName } from '../../settings.remote';
	import { logout } from '../../login.remote';
	import { mailboxes, quota } from '../../mail.remote';
	import { rules as rulesQuery, saveRules } from '../../rules.remote';
	import RulesEditor from '#lib/components/settings/RulesEditor.svelte';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import { identityStyle } from '#lib/mail/colors';
	import { initials } from '#lib/mail/rows';
	import type { MailRule } from '@zaur/mail-core';
	import {
		prefs,
		setPref,
		adoptAccountPrefs,
		PAGE_SIZES,
		DEFAULT_PREFS,
		LIST_MIN,
		LIST_MAX
	} from '#lib/settings.svelte.ts';
	import { accountPrefs, setAccountPrefs } from '../../settings.remote';

	const session = $derived(whoami()?.current ?? null);
	const identitiesResource = $derived(session ? identities() : undefined);
	const quotaResource = $derived(session ? quota() : undefined);
	const rulesResource = $derived(session ? rulesQuery() : undefined);
	const accountPrefsResource = $derived(session ? accountPrefs() : undefined);

	// Landing straight on /settings has to adopt the account's copy too.
	$effect(() => {
		if (!session || accountPrefsResource?.loading !== false) return;
		adoptAccountPrefs(accountPrefsResource.current ?? null, (changed) => {
			void setAccountPrefs(changed).catch(() => {});
		});
	});
	const mailboxesResource = $derived(session ? mailboxes() : undefined);
	let savingRules = $state(false);

	async function persistRules(next: MailRule[], takeOver: boolean) {
		savingRules = true;
		status = null;
		try {
			const { count } = await saveRules({ rules: next, takeOver });
			await rulesResource?.refresh();
			status = { text: count === 1 ? '1 rule active' : `${count} rules active` };
		} catch (cause) {
			status = {
				text: cause instanceof Error ? cause.message : 'Could not save the rules',
				error: true
			};
		} finally {
			savingRules = false;
		}
	}

	// Send-as names are edited per identity; keep the pending edits keyed by id.
	let names = $state<Record<string, string>>({});
	let saving = $state<string | null>(null);
	let status = $state<{ text: string; error?: boolean } | null>(null);

	const rows = $derived(
		(identitiesResource?.current ?? []).map((identity) => ({
			...identity,
			draft: names[identity.id] ?? identity.name
		}))
	);

	async function saveName(id: string, value: string) {
		saving = id;
		status = null;
		try {
			await setDisplayName({ identityId: id, name: value });
			await identitiesResource?.refresh();
			delete names[id];
			status = { text: 'Display name saved' };
		} catch (cause) {
			status = { text: cause instanceof Error ? cause.message : 'Could not save', error: true };
		} finally {
			saving = null;
		}
	}

	function signOut() {
		void logout().then(() => goto('/login', { replaceState: true }));
	}

	const storage = $derived.by(() => {
		const q = quotaResource?.current;
		if (!q || !q.limit) return null;
		const gb = (bytes: number) => (bytes / 1_000_000_000).toFixed(2);
		return { label: `${gb(q.used)} GB of ${gb(q.limit)} GB used`, pct: Math.min(100, Math.round((q.used / q.limit) * 100)) };
	});

	const card = 'rounded-[10px] border border-[#e2e8f0] bg-white p-[18px] shadow-[var(--z-shadow-tactile)] max-md:p-4';
	const blurb = 'mt-[7px] text-[12.5px] leading-[1.6] text-[#475569]';
	const rowLabel = 'text-[13px] font-medium text-[#1e293b]';
</script>

<svelte:head><title>Settings · Zaur Mail</title></svelte:head>

<StatusNote {status} />

<!-- Account -->
<section class={card}>
	<h2 class="z-caption">Account</h2>
	<div class="mt-3 flex items-center justify-between gap-3">
		<div class="flex min-w-0 items-center gap-[11px]">
			{#if session}
				<span class="z-avatar !size-[34px] !text-[12px]" style={identityStyle(session.username)} aria-hidden="true">
					{initials(session.displayName ?? '', session.username)}
				</span>
			{/if}
			<div class="min-w-0">
				<div class="truncate text-[14px] font-bold text-[#0b1220]">
					{session?.displayName ?? session?.username ?? '—'}
				</div>
				<div class="z-mono truncate text-[11px] text-[#64748b]">{session?.username ?? ''}</div>
			</div>
		</div>
		<button type="button" class="btn-tactile btn-danger shrink-0" onclick={signOut}>Sign out</button>
	</div>
	{#if storage}
		<div class="mt-3.5 flex items-center gap-2.5">
			<div class="h-[7px] flex-1 overflow-hidden rounded-full border border-[#cbd5e1] bg-[#f1f5f9]">
				<div class="h-full bg-[#2563eb]" style:width="{storage.pct}%"></div>
			</div>
			<span class="z-mono shrink-0 text-[10.5px] text-[#475569]">{storage.label}</span>
		</div>
	{/if}
	<p class="mt-3 text-[12.5px] text-[#475569]">
		Password, two-factor authentication, app passwords and signed-in devices are under
		<a href="/settings/security" class="font-semibold text-[#2563eb] hover:text-[#1d4ed8]">Security</a>.
	</p>
</section>

<!-- Send-as display names -->
<section class={card}>
	<h2 class="z-caption">Display name</h2>
	<p class={blurb}>The name recipients see next to each of your addresses.</p>
	{#if identitiesResource?.error}
		<p class="mt-3 text-[13px] text-[#b91c1c]">Could not load your addresses.</p>
	{:else if !identitiesResource?.current}
		<div class="z-skeleton mt-3 flex flex-col gap-2.5" aria-hidden="true">
			<div class="h-[34px] rounded-[8px] bg-[#f1f5f9]"></div>
		</div>
	{:else}
		<div class="mt-3 flex flex-col gap-2.5">
			{#each rows as row (row.id)}
				{@const dirty = row.draft !== row.name}
				<div class="flex items-end gap-2">
					<label class="min-w-0 flex-1">
						<span class="z-mono block truncate text-[10.5px] text-[#64748b]">{row.email}</span>
						<input
							type="text"
							maxlength="120"
							value={row.draft}
							oninput={(event) => (names[row.id] = event.currentTarget.value)}
							onkeydown={(event) => {
								if (event.key === 'Enter') void saveName(row.id, row.draft);
							}}
							placeholder="Your name"
							aria-label="Display name"
							class="z-field mt-[5px] w-full max-md:text-base"
						/>
					</label>
					<!-- Primary while there is something to save; a quiet "Saved" otherwise. -->
					<button
						type="button"
						class="btn-tactile !h-[34px] {dirty ? 'btn-primary' : ''}"
						disabled={saving === row.id || !dirty}
						onclick={() => void saveName(row.id, row.draft)}
					>
						{saving === row.id ? 'Saving…' : dirty ? 'Save' : 'Saved'}
					</button>
				</div>
			{/each}
		</div>
	{/if}
</section>

<RulesEditor
	data={rulesResource?.current}
	error={rulesResource?.error}
	mailboxes={mailboxesResource?.current}
	saving={savingRules}
	onSave={(next, takeOver) => void persistRules(next, takeOver)}
/>

<!-- Reading prefs -->
<section class={card}>
	<h2 class="z-caption">Reading</h2>
	<p class={blurb}>These follow your account, so a new device starts where you left off.</p>

	<div class="mt-3.5 flex flex-col">
		<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[#f1f5f9] py-[11px]">
			<span class={rowLabel}>Mark messages read when opened</span>
			<input type="checkbox" class="z-check !size-[19px]" checked={prefs.markReadOnOpen} onchange={(event) => setPref('markReadOnOpen', event.currentTarget.checked)} />
		</label>

		<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[#f1f5f9] py-[11px]">
			<span class={rowLabel}>Show preview line in the list</span>
			<input type="checkbox" class="z-check !size-[19px]" checked={prefs.showPreview} onchange={(event) => setPref('showPreview', event.currentTarget.checked)} />
		</label>

		<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[#f1f5f9] py-[11px]">
			<span class={rowLabel}>Open folders on Unseen</span>
			<input type="checkbox" class="z-check !size-[19px]" checked={prefs.unseenByDefault} onchange={(event) => setPref('unseenByDefault', event.currentTarget.checked)} />
		</label>

		<div class="flex items-center justify-between gap-4 border-t border-[#f1f5f9] py-[11px]">
			<span class={rowLabel}>Messages per folder</span>
			<div class="z-group" role="group" aria-label="Messages per folder">
				{#each PAGE_SIZES as size (size)}
					<button
						type="button"
						class="z-segment z-mono !h-[26px] !px-[9px] !text-[11.5px]"
						aria-pressed={prefs.pageSize === size}
						onclick={() => setPref('pageSize', size)}
					>
						{size}
					</button>
				{/each}
			</div>
		</div>

		<!--
			Not synced on purpose: a pixel width means something different on a
			different screen.
		-->
		<label class="flex items-center justify-between gap-4 border-t border-[#f1f5f9] py-[11px] max-md:hidden">
			<span class="min-w-0">
				<span class="block {rowLabel}">Message list width</span>
				<span class="z-mono block text-[10.5px] text-[#64748b]">This device only</span>
			</span>
			<span class="flex items-center gap-2.5">
				<input
					type="range"
					min={LIST_MIN}
					max={LIST_MAX}
					step="10"
					class="z-range w-40"
					value={prefs.listWidth}
					oninput={(event) => setPref('listWidth', Number(event.currentTarget.value))}
				/>
				<span class="z-mono w-[52px] text-right text-[11px] text-[#475569]">{prefs.listWidth}px</span>
			</span>
		</label>
	</div>

	<button
		type="button"
		class="btn-tactile mt-4 !h-8"
		onclick={() => {
			for (const key of Object.keys(DEFAULT_PREFS) as (keyof typeof DEFAULT_PREFS)[]) {
				setPref(key, DEFAULT_PREFS[key] as never);
			}
		}}
	>
		Reset to defaults
	</button>
</section>

<style>
	/* The slider: a 7px track, the accent for the filled part, a tactile thumb. */
	.z-range {
		appearance: none;
		height: 7px;
		border-radius: 999px;
		background: #e2e8f0;
		outline-offset: 4px;
	}

	.z-range::-webkit-slider-thumb {
		appearance: none;
		width: 17px;
		height: 17px;
		border-radius: 999px;
		border: 1px solid #1d4ed8;
		background: #ffffff;
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
		cursor: pointer;
	}

	.z-range::-moz-range-thumb {
		width: 17px;
		height: 17px;
		border-radius: 999px;
		border: 1px solid #1d4ed8;
		background: #ffffff;
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
		cursor: pointer;
	}

	.z-range::-moz-range-progress {
		height: 7px;
		border-radius: 999px;
		background: #2563eb;
	}
</style>
