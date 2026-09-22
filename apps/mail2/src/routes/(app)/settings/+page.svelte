<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { disablePush, enablePush, pushStatus, type PushStatus } from '#lib/push';
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
		THEMES,
		DEFAULT_PREFS,
		LIST_MIN,
		LIST_MAX
	} from '#lib/settings.svelte.ts';
	import { accountPrefs, setAccountPrefs, aiCategoriesOffered } from '../../settings.remote';
	import { CATEGORIES } from '@zaur/mail-core';

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
	const aiOffered = $derived(session ? aiCategoriesOffered() : undefined);
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

	// Notifications belong to the device, like Appearance: read from the browser each visit.
	let push = $state<PushStatus | null>(null);
	let pushBusy = $state(false);
	onMount(() => {
		pushStatus()
			.then((next) => (push = next))
			.catch(() => (push = 'unsupported'));
	});

	async function togglePush() {
		pushBusy = true;
		status = null;
		try {
			push = push === 'on' ? await disablePush() : await enablePush();
		} catch (cause) {
			status = { text: cause instanceof Error ? cause.message : 'Could not change notifications', error: true };
		} finally {
			pushBusy = false;
		}
	}

	const pushNote: Record<PushStatus, string> = {
		unconfigured: 'Not set up on this server',
		unsupported: 'This browser cannot show notifications',
		install: 'Add Zaur to your Home Screen (Share → Add to Home Screen) and open it from there',
		denied: 'Blocked in your browser settings for this site',
		off: 'Off on this device',
		on: 'On for this device'
	};

	const card = 'rounded-[10px] border border-[var(--z-hairline)] bg-[var(--z-surface)] p-[18px] shadow-[var(--z-shadow-tactile)] max-md:p-4';
	const blurb = 'mt-[7px] text-[12.5px] leading-[1.6] text-[var(--z-muted)]';
	const rowLabel = 'text-[13px] font-medium text-[var(--z-body)]';
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
				<div class="truncate text-[14px] font-bold text-[var(--z-ink)]">
					{session?.displayName ?? session?.username ?? '—'}
				</div>
				<div class="z-mono truncate text-[11px] text-[var(--z-soft)]">{session?.username ?? ''}</div>
			</div>
		</div>
		<button type="button" class="btn-tactile btn-danger shrink-0" onclick={signOut}>Sign out</button>
	</div>
	{#if storage}
		<div class="mt-3.5 flex items-center gap-2.5">
			<div class="h-[7px] flex-1 overflow-hidden rounded-full border border-[var(--z-line)] bg-[var(--z-sunken)]">
				<div class="h-full bg-[var(--z-accent)]" style:width="{storage.pct}%"></div>
			</div>
			<span class="z-mono shrink-0 text-[10.5px] text-[var(--z-muted)]">{storage.label}</span>
		</div>
	{/if}
	<p class="mt-3 text-[12.5px] text-[var(--z-muted)]">
		Password, two-factor authentication, app passwords and signed-in devices are under
		<a href="/settings/security" class="font-semibold text-[var(--z-accent)] hover:text-[var(--z-accent-edge)]">Security</a>.
	</p>
</section>

<!-- Send-as display names -->
<section class={card}>
	<h2 class="z-caption">Display name</h2>
	<p class={blurb}>The name recipients see next to each of your addresses.</p>
	{#if identitiesResource?.error}
		<p class="mt-3 text-[13px] text-[var(--z-ch-discard-ink)]">Could not load your addresses.</p>
	{:else if !identitiesResource?.current}
		<div class="z-skeleton mt-3 flex flex-col gap-2.5" aria-hidden="true">
			<div class="h-[34px] rounded-[8px] bg-[var(--z-sunken)]"></div>
		</div>
	{:else}
		<div class="mt-3 flex flex-col gap-2.5">
			{#each rows as row (row.id)}
				{@const dirty = row.draft !== row.name}
				<div class="flex items-end gap-2">
					<label class="min-w-0 flex-1">
						<span class="z-mono block truncate text-[10.5px] text-[var(--z-soft)]">{row.email}</span>
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

<!-- Categories -->
<section class={card}>
	<h2 class="z-caption">Categories</h2>
	<p class={blurb}>
		A category names what a message is — it shows as a chip in the list and as a filter.
		A rule above with <em>Categorise as</em> sets one on delivery; the AI only looks at
		mail no rule has categorised, so your rules always win.
	</p>
	<dl class="mt-3.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
		{#each CATEGORIES as category (category.id)}
			<dt class={rowLabel}>{category.label}</dt>
			<dd class="text-[var(--z-muted)]">{category.hint}</dd>
		{/each}
	</dl>
	{#if aiOffered?.current}
		<label class="mt-3.5 flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
			<span>
				<span class="block {rowLabel}">Categorise the rest with AI</span>
				<span class="block text-[12px] text-[var(--z-muted)]">Sends sender, subject and preview of uncategorised mail to TypeSafe. Off by default.</span>
			</span>
			<input type="checkbox" class="z-check !size-[19px]" checked={prefs.aiCategories} onchange={(event) => setPref('aiCategories', event.currentTarget.checked)} />
		</label>
	{/if}
</section>

<!-- Reading prefs -->
<section class={card}>
	<h2 class="z-caption">Reading</h2>
	<p class={blurb}>These follow your account, so a new device starts where you left off.</p>

	<div class="mt-3.5 flex flex-col">
		<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
			<span class={rowLabel}>Mark messages read when opened</span>
			<input type="checkbox" class="z-check !size-[19px]" checked={prefs.markReadOnOpen} onchange={(event) => setPref('markReadOnOpen', event.currentTarget.checked)} />
		</label>

		<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
			<span class={rowLabel}>Show preview line in the list</span>
			<input type="checkbox" class="z-check !size-[19px]" checked={prefs.showPreview} onchange={(event) => setPref('showPreview', event.currentTarget.checked)} />
		</label>

		<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
			<span class={rowLabel}>Show sender avatars</span>
			<input type="checkbox" class="z-check !size-[19px]" checked={prefs.showAvatars} onchange={(event) => setPref('showAvatars', event.currentTarget.checked)} />
		</label>

		<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
			<span class={rowLabel}>Open folders on Unseen</span>
			<input type="checkbox" class="z-check !size-[19px]" checked={prefs.unseenByDefault} onchange={(event) => setPref('unseenByDefault', event.currentTarget.checked)} />
		</label>

		<div class="flex items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
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

		<div class="flex items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
			<span class="min-w-0">
				<span class="{rowLabel} block">New messages start as</span>
				<span class="mt-[1px] block text-[11.5px] leading-[1.35] text-[var(--z-soft)]">
					Either can be switched per message, with Plain in the compose bar.
				</span>
			</span>
			<div class="z-group" role="group" aria-label="New messages start as">
				{#each [{ plain: false, label: 'Rich text' }, { plain: true, label: 'Plain text' }] as mode (mode.label)}
					<button
						type="button"
						class="z-segment !h-[26px] !px-[9px] !text-[11.5px]"
						aria-pressed={prefs.composePlain === mode.plain}
						onclick={() => setPref('composePlain', mode.plain)}
					>
						{mode.label}
					</button>
				{/each}
			</div>
		</div>

		<!--
			Not synced on purpose: a theme and a pixel width mean something
			different on a different screen.
		-->
		<div class="flex items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
			<span class="min-w-0">
				<span class="block {rowLabel}">Appearance</span>
				<span class="z-mono block text-[10.5px] text-[var(--z-soft)]">This device only</span>
			</span>
			<div class="z-group" role="group" aria-label="Appearance">
				{#each THEMES as theme (theme)}
					<button
						type="button"
						class="z-segment !h-[26px] !px-[9px] capitalize"
						aria-pressed={prefs.theme === theme}
						onclick={() => setPref('theme', theme)}
					>
						{theme}
					</button>
				{/each}
			</div>
		</div>

		<label class="flex items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px] max-md:hidden">
			<span class="min-w-0">
				<span class="block {rowLabel}">Message list width</span>
				<span class="z-mono block text-[10.5px] text-[var(--z-soft)]">This device only</span>
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
				<span class="z-mono w-[52px] text-right text-[11px] text-[var(--z-muted)]">{prefs.listWidth}px</span>
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

<!-- Notifications -->
<section class={card}>
	<h2 class="z-caption">Notifications</h2>
	<p class={blurb}>New mail in your inbox, even when Zaur Mail is closed. Each device asks for itself.</p>

	<div class="mt-3.5 flex items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
		<span class="min-w-0">
			<span class="block {rowLabel}">New mail</span>
			<span class="z-mono block text-[10.5px] text-[var(--z-soft)]">{push ? pushNote[push] : 'Checking…'}</span>
		</span>
		{#if push === 'on' || push === 'off'}
			<button
				type="button"
				class="btn-tactile shrink-0 !h-8 {push === 'off' ? 'btn-primary' : ''}"
				disabled={pushBusy}
				onclick={togglePush}
			>
				{push === 'on' ? 'Turn off' : 'Turn on'}
			</button>
		{/if}
	</div>
</section>

<style>
	/* The slider: a 7px track, the accent for the filled part, a tactile thumb. */
	.z-range {
		appearance: none;
		height: 7px;
		border-radius: 999px;
		background: var(--z-hairline);
		outline-offset: 4px;
	}

	.z-range::-webkit-slider-thumb {
		appearance: none;
		width: 17px;
		height: 17px;
		border-radius: 999px;
		border: 1px solid var(--z-accent-edge);
		background: var(--z-surface);
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
		cursor: pointer;
	}

	.z-range::-moz-range-thumb {
		width: 17px;
		height: 17px;
		border-radius: 999px;
		border: 1px solid var(--z-accent-edge);
		background: var(--z-surface);
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
		cursor: pointer;
	}

	.z-range::-moz-range-progress {
		height: 7px;
		border-radius: 999px;
		background: var(--z-accent);
	}
</style>
