<script lang="ts">
	import { goto } from '$app/navigation';
	import { whoami } from '../../session.remote';
	import { identities, setDisplayName } from '../../settings.remote';
	import { logout } from '../../login.remote';
	import { mailboxes, quota } from '../../mail.remote';
	import { rules as rulesQuery, saveRules } from '../../rules.remote';
	import RulesEditor from '#lib/components/settings/RulesEditor.svelte';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
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

	const quotaLabel = $derived.by(() => {
		const q = quotaResource?.current;
		if (!q || !q.limit) return null;
		const gb = (bytes: number) => (bytes / 1_000_000_000).toFixed(2);
		return `${gb(q.used)} GB of ${gb(q.limit)} GB used`;
	});
</script>

<svelte:head><title>Settings · Zaur Mail</title></svelte:head>

<StatusNote {status} />

<!-- Account -->
<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-5 shadow-2xs max-md:p-4">
	<h2 class="z-caption">Account</h2>
	<div class="mt-3 flex items-baseline justify-between gap-3">
		<div>
			<div class="text-[14px] font-semibold text-slate-900">
				{session?.displayName ?? session?.username ?? '—'}
			</div>
			<div class="text-[13px] text-slate-500">{session?.username ?? ''}</div>
		</div>
		<button type="button" class="btn-tactile !text-red-600" onclick={signOut}>Sign out</button>
	</div>
	{#if quotaLabel}
		<p class="mt-3 text-[12.5px] text-slate-500">{quotaLabel}</p>
	{/if}
	<p class="mt-3 text-[12.5px] text-slate-500">
		Password, two-factor authentication, app passwords and signed-in devices are under
		<a href="/settings/security" class="font-semibold text-accent hover:underline">Security</a>.
	</p>
</section>

<!-- Send-as display names -->
<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-5 shadow-2xs max-md:p-4">
	<h2 class="z-caption">Display name</h2>
	<p class="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
		The name recipients see next to each of your addresses.
	</p>
	{#if identitiesResource?.error}
		<p class="mt-3 text-[13px] text-red-600">Could not load your addresses.</p>
	{:else if !identitiesResource?.current}
		<p class="mt-3 text-[13px] text-slate-400">Loading…</p>
	{:else}
		<div class="mt-3 flex flex-col gap-3">
			{#each rows as row (row.id)}
				<div class="flex items-end gap-2">
					<label class="min-w-0 flex-1">
						<span class="block truncate text-[12px] text-slate-500">{row.email}</span>
						<input
							type="text"
							maxlength="120"
							value={row.draft}
							oninput={(event) => (names[row.id] = event.currentTarget.value)}
							onkeydown={(event) => {
								if (event.key === 'Enter') void saveName(row.id, row.draft);
							}}
							placeholder="Your name"
							class="z-field mt-1 w-full max-md:text-base"
						/>
					</label>
					<button
						type="button"
						class="btn-tactile !h-[32px]"
						disabled={saving === row.id || row.draft === row.name}
						onclick={() => void saveName(row.id, row.draft)}
					>
						{saving === row.id ? 'Saving…' : 'Save'}
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
<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-5 shadow-2xs max-md:p-4">
	<h2 class="z-caption">Reading</h2>
	<p class="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
		These follow your account, so a new device starts where you left off.
	</p>

	<div class="mt-4 flex flex-col divide-y divide-[#f1f5f9]">
		<label class="flex items-center justify-between gap-4 py-2.5">
			<span class="text-[13px] font-medium text-slate-800">Mark messages read when opened</span>
			<input
				type="checkbox"
				class="z-check"
				checked={prefs.markReadOnOpen}
				onchange={(event) => setPref('markReadOnOpen', event.currentTarget.checked)}
			/>
		</label>

		<label class="flex items-center justify-between gap-4 py-2.5">
			<span class="text-[13px] font-medium text-slate-800">Show preview line in the list</span>
			<input
				type="checkbox"
				class="z-check"
				checked={prefs.showPreview}
				onchange={(event) => setPref('showPreview', event.currentTarget.checked)}
			/>
		</label>

		<label class="flex items-center justify-between gap-4 py-2.5">
			<span class="text-[13px] font-medium text-slate-800">Open folders on Unseen</span>
			<input
				type="checkbox"
				class="z-check"
				checked={prefs.unseenByDefault}
				onchange={(event) => setPref('unseenByDefault', event.currentTarget.checked)}
			/>
		</label>

		<label class="flex items-center justify-between gap-4 py-2.5">
			<span class="text-[13px] font-medium text-slate-800">Messages per folder</span>
			<select
				class="h-[30px] rounded-[6px] border border-[#cbd5e1] bg-white px-2 text-[13px] shadow-2xs focus:border-blue-500 focus:outline-none"
				value={prefs.pageSize}
				onchange={(event) => setPref('pageSize', Number(event.currentTarget.value))}
			>
				{#each PAGE_SIZES as size (size)}
					<option value={size}>{size}</option>
				{/each}
			</select>
		</label>

		<!--
			The two below are deliberately not synced: a pixel width and a
			sidebar state mean different things on a different screen.
		-->
		<label class="flex items-center justify-between gap-4 py-2.5 max-md:hidden">
			<span class="min-w-0">
				<span class="block text-[13px] font-medium text-slate-800">Message list width</span>
				<span class="block text-[12px] text-slate-400">This device only</span>
			</span>
			<span class="flex items-center gap-2">
				<input
					type="range"
					min={LIST_MIN}
					max={LIST_MAX}
					step="10"
					class="w-40 accent-blue-600"
					value={prefs.listWidth}
					oninput={(event) => setPref('listWidth', Number(event.currentTarget.value))}
				/>
				<span class="w-12 text-right text-[12px] text-slate-500 tabular-nums">
					{prefs.listWidth}px
				</span>
			</span>
		</label>
	</div>

	<button
		type="button"
		class="btn-tactile mt-4"
		onclick={() => {
			for (const key of Object.keys(DEFAULT_PREFS) as (keyof typeof DEFAULT_PREFS)[]) {
				setPref(key, DEFAULT_PREFS[key] as never);
			}
		}}
	>
		Reset to defaults
	</button>
</section>
