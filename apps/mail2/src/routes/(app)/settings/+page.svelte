<script lang="ts">
	import { messageOf } from '#lib/errors';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { disablePush, enablePush, pushStatus, type PushStatus } from '#lib/push';
	import { whoami } from '../../session.remote';
	import { identities, updateIdentity, vacation as vacationQuery, saveVacation, type VacationDTO } from '../../settings.remote';
	import { logout } from '../../login.remote';
	import { createFolder, deleteFolder, mailboxes, quota, updateFolder } from '../../mail.remote';
	import type { MailboxDTO } from '#lib/mail/types';
	import { withoutBranch } from '#lib/mail/folders';
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

	const who = whoami();
	const session = $derived(who.current ?? null);
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
				text: messageOf(cause, 'Could not save the rules'),
				error: true
			};
		} finally {
			savingRules = false;
		}
	}

	// Names and signatures are edited per address; keep the pending edits keyed by id.
	let edits = $state<Record<string, { name?: string; signature?: string }>>({});
	let saving = $state<string | null>(null);
	let status = $state<{ text: string; error?: boolean } | null>(null);

	const rows = $derived(
		(identitiesResource?.current ?? []).map((identity) => ({
			...identity,
			draftName: edits[identity.id]?.name ?? identity.name,
			draftSignature: edits[identity.id]?.signature ?? identity.signature
		}))
	);

	function edit(id: string, patch: { name?: string; signature?: string }) {
		edits[id] = { ...edits[id], ...patch };
	}

	async function saveIdentity(row: (typeof rows)[number]) {
		saving = row.id;
		status = null;
		try {
			await updateIdentity({ identityId: row.id, name: row.draftName, signature: row.draftSignature });
			delete edits[row.id];
			status = { text: 'Saved' };
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not save'), error: true };
		} finally {
			saving = null;
		}
	}

	// The auto-reply is one form with one Save: half a vacation (dates, no message) is worse than none.
	const vacationResource = $derived(session ? vacationQuery() : undefined);
	let away = $state<Omit<VacationDTO, 'supported'> | null>(null);
	let savingAway = $state(false);
	$effect(() => {
		const current = vacationResource?.current;
		if (current && !away) away = { isEnabled: current.isEnabled, fromDate: current.fromDate, toDate: current.toDate, subject: current.subject, textBody: current.textBody };
	});
	const awayDirty = $derived.by(() => {
		const current = vacationResource?.current;
		if (!current || !away) return false;
		return (['isEnabled', 'fromDate', 'toDate', 'subject', 'textBody'] as const).some((key) => away![key] !== current[key]);
	});

	async function persistAway() {
		if (!away) return;
		savingAway = true;
		status = null;
		try {
			await saveVacation(away);
			status = { text: away.isEnabled ? 'Auto-reply on' : 'Auto-reply saved, off' };
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not save the auto-reply'), error: true };
		} finally {
			savingAway = false;
		}
	}

	// Folders: your own ones, parents first. One is open for editing at a time.
	const folders = $derived((mailboxesResource?.current ?? []).filter((mailbox) => !mailbox.role));
	let editingFolder = $state<{ id: string; name: string; parentId: string } | null>(null);
	let newFolder = $state({ name: '', parentId: '' });
	let folderBusy = $state(false);

	/** Where a folder can go: anywhere but inside itself. */
	async function folderAction(run: () => Promise<unknown>, done: string) {
		folderBusy = true;
		status = null;
		try {
			await run();
			status = { text: done };
			return true;
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not change the folder'), error: true };
			return false;
		} finally {
			folderBusy = false;
		}
	}

	async function addFolder() {
		const name = newFolder.name.trim();
		if (!name) return;
		if (await folderAction(() => createFolder({ name, parentId: newFolder.parentId || null }), `Created ${name}`)) {
			newFolder = { name: '', parentId: '' };
		}
	}

	async function saveFolder() {
		const edit = editingFolder;
		if (!edit) return;
		if (await folderAction(() => updateFolder({ id: edit.id, name: edit.name, parentId: edit.parentId || null }), 'Folder saved')) {
			editingFolder = null;
		}
	}

	async function removeFolder(folder: MailboxDTO) {
		const inside = folder.total ? ` and its ${folder.total === 1 ? 'message' : `${folder.total} messages`}` : '';
		if (!confirm(`Delete “${folder.name}”${inside}? This can't be undone.`)) return;
		if (await folderAction(() => deleteFolder({ id: folder.id }), `Deleted ${folder.name}`)) editingFolder = null;
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
			status = { text: messageOf(cause, 'Could not change notifications'), error: true };
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

	const blurb = 'text-[12.5px] leading-[1.6] text-[var(--z-muted)]';
	const rowLabel = 'text-[13px] font-medium text-[var(--z-body)]';
</script>

<svelte:head><title>Settings · Zaur Mail</title></svelte:head>

<StatusNote {status} />

<!-- Account -->
<section class="z-card">
	<h2 class="z-card-head">Account</h2>
	<div class="z-card-body">
		<div class="flex items-center justify-between gap-3">
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
	</div>
	<p class="z-card-foot">
		<span>
			Password, two-factor authentication, app passwords and signed-in devices are under
			<a href="/settings/security" class="font-semibold text-[var(--z-accent)] hover:text-[var(--z-accent-edge)]">Security</a>.
		</span>
	</p>
</section>

<!-- Send-as addresses: the name recipients see, and the signature compose adds -->
<section class="z-card">
	<h2 class="z-card-head">Addresses</h2>
	<div class="z-card-body">
		<p class={blurb}>
			The name recipients see next to each of your addresses, and the signature new messages
			start with. Compose adds it under a “-- ” line and swaps it when you change From.
		</p>
		{#if identitiesResource?.error}
			<p class="mt-3 text-[13px] text-[var(--z-ch-discard-ink)]">Could not load your addresses.</p>
		{:else if !identitiesResource?.current}
			<div class="z-skeleton mt-3 flex flex-col gap-2.5" aria-hidden="true">
				<div class="h-[34px] rounded-[8px] bg-[var(--z-sunken)]"></div>
			</div>
		{:else}
			<div class="mt-3 flex flex-col">
				{#each rows as row, index (row.id)}
					{@const dirty = row.draftName !== row.name || row.draftSignature !== row.signature}
					<div class="flex flex-col gap-2 py-3 {index > 0 ? 'border-t border-[var(--z-sunken)]' : 'pt-0'}">
						<span class="z-mono block truncate text-[10.5px] text-[var(--z-soft)]">{row.email}</span>
						<input
							type="text"
							maxlength="120"
							value={row.draftName}
							oninput={(event) => edit(row.id, { name: event.currentTarget.value })}
							onkeydown={(event) => {
								if (event.key === 'Enter' && dirty) void saveIdentity(row);
							}}
							placeholder="Your name"
							aria-label="Display name for {row.email}"
							class="z-field w-full max-md:text-base"
						/>
						<textarea
							rows="3"
							maxlength="4000"
							value={row.draftSignature}
							oninput={(event) => edit(row.id, { signature: event.currentTarget.value })}
							placeholder="Signature (optional)"
							aria-label="Signature for {row.email}"
							class="z-field font-(family-name:--font-mail-mono) !h-auto w-full resize-y py-2 text-[13px] leading-[1.5] max-md:text-base"
						></textarea>
						<!-- Primary while there is something to save; a quiet "Saved" otherwise. -->
						<button
							type="button"
							class="btn-tactile !h-[30px] self-end {dirty ? 'btn-primary' : ''}"
							disabled={saving === row.id || !dirty}
							onclick={() => void saveIdentity(row)}
						>
							{saving === row.id ? 'Saving…' : dirty ? 'Save' : 'Saved'}
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>

<!-- Out of office: JMAP VacationResponse, answered by the server whether or not Zaur is open -->
{#if vacationResource?.current?.supported !== false}
	<section class="z-card">
		<h2 class="z-card-head">Auto-reply</h2>
		<div class="z-card-body">
			<p class={blurb}>Answers incoming mail while you're away. The server sends it, so it works with Zaur closed.</p>
			{#if vacationResource?.error}
				<p class="mt-3 text-[13px] text-[var(--z-ch-discard-ink)]">Could not load your auto-reply.</p>
			{:else if !away}
				<div class="z-skeleton mt-3 h-[34px] rounded-[8px] bg-[var(--z-sunken)]" aria-hidden="true"></div>
			{:else}
				<label class="mt-3.5 flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
					<span class={rowLabel}>Reply automatically</span>
					<input type="checkbox" class="z-check" bind:checked={away.isEnabled} />
				</label>
				<div class="grid grid-cols-2 gap-2.5 border-t border-[var(--z-sunken)] py-[11px]">
					<label class="min-w-0">
						<span class="block text-[12px] text-[var(--z-muted)]">First day</span>
						<input type="date" bind:value={away.fromDate} max={away.toDate || undefined} class="z-field mt-[5px] w-full max-md:text-base" />
					</label>
					<label class="min-w-0">
						<span class="block text-[12px] text-[var(--z-muted)]">Last day</span>
						<input type="date" bind:value={away.toDate} min={away.fromDate || undefined} class="z-field mt-[5px] w-full max-md:text-base" />
					</label>
					<span class="col-span-2 text-[11.5px] text-[var(--z-soft)]">Leave empty to start now, or to keep replying until you switch it off.</span>
				</div>
				<div class="flex flex-col gap-2 border-t border-[var(--z-sunken)] pt-[11px]">
					<input type="text" maxlength="200" bind:value={away.subject} placeholder="Subject (optional)" aria-label="Auto-reply subject" class="z-field w-full max-md:text-base" />
					<textarea
						rows="4"
						maxlength="8000"
						bind:value={away.textBody}
						placeholder="I'm away until … and will reply when I'm back."
						aria-label="Auto-reply message"
						class="z-field !h-auto w-full resize-y py-2 text-[13px] leading-[1.5] max-md:text-base"
					></textarea>
				</div>
			{/if}
		</div>
		{#if away}
			<div class="z-card-foot">
				<button type="button" class="btn-tactile !h-[30px] {awayDirty ? 'btn-primary' : ''}" disabled={savingAway || !awayDirty} onclick={persistAway}>
					{savingAway ? 'Saving…' : awayDirty ? 'Save' : 'Saved'}
				</button>
			</div>
		{/if}
	</section>
{/if}

<!-- Your own folders; Inbox, Sent and the rest belong to the server -->
<section class="z-card" id="folders">
	<h2 class="z-card-head">Folders</h2>
	<div class="z-card-body">
		<p class={blurb}>Folders of your own, for filing by hand or by a rule. A folder can sit inside another.</p>
		{#snippet parentSelect(value: string, self: MailboxDTO | null, onchange: (next: string) => void)}
			<select class="z-field min-w-0 !h-[30px]" aria-label="Inside" {value} onchange={(event) => onchange(event.currentTarget.value)}>
				<option value="">Top level</option>
				{#each withoutBranch(mailboxesResource?.current ?? [], self) as mailbox (mailbox.id)}
					<option value={mailbox.id}>{'\u00a0\u00a0\u00a0'.repeat(mailbox.depth)}{mailbox.name}</option>
				{/each}
			</select>
		{/snippet}
		{#if mailboxesResource?.error}
			<p class="mt-3 text-[13px] text-[var(--z-ch-discard-ink)]">Could not load your folders.</p>
		{:else if !mailboxesResource?.current}
			<div class="z-skeleton mt-3 h-[34px] rounded-[8px] bg-[var(--z-sunken)]" aria-hidden="true"></div>
		{:else}
			<ul class="mt-3 flex flex-col" role="list">
				{#each folders as folder (folder.id)}
					<li class="border-t border-[var(--z-sunken)] py-2">
						{#if editingFolder?.id === folder.id}
							<div class="flex flex-wrap items-center gap-2">
								<input
									type="text"
									maxlength="100"
									bind:value={editingFolder.name}
									aria-label="Folder name"
									class="z-field min-w-0 flex-1 !h-[30px] max-md:text-base"
									onkeydown={(event) => {
										if (event.key === 'Enter') void saveFolder();
										if (event.key === 'Escape') editingFolder = null;
									}}
								/>
								{@render parentSelect(editingFolder.parentId, folder, (next) => editingFolder && (editingFolder.parentId = next))}
								<button type="button" class="btn-tactile btn-primary !h-[30px]" disabled={folderBusy || !editingFolder.name.trim()} onclick={saveFolder}>Save</button>
								<button type="button" class="btn-tactile !h-[30px]" onclick={() => (editingFolder = null)}>Cancel</button>
								<button type="button" class="btn-tactile btn-danger !h-[30px]" disabled={folderBusy} onclick={() => void removeFolder(folder)}>Delete</button>
							</div>
						{:else}
							<div class="flex items-center justify-between gap-3" style:padding-left="{folder.depth * 14}px">
								<span class="min-w-0 truncate {rowLabel}">{folder.name}</span>
								<span class="flex shrink-0 items-center gap-2.5">
									<span class="z-mono text-[10.5px] text-[var(--z-soft)]">{folder.total}</span>
									<button
										type="button"
										class="btn-tactile !h-7 !text-[12px]"
										onclick={() => (editingFolder = { id: folder.id, name: folder.name, parentId: folder.parentId ?? '' })}
									>
										Edit
									</button>
								</span>
							</div>
						{/if}
					</li>
				{:else}
					<li class="border-t border-[var(--z-sunken)] py-2 text-[12.5px] text-[var(--z-muted)]">None yet.</li>
				{/each}
			</ul>
			<div class="flex flex-wrap items-center gap-2 border-t border-[var(--z-sunken)] pt-3">
				<input
					type="text"
					maxlength="100"
					bind:value={newFolder.name}
					placeholder="New folder"
					aria-label="New folder name"
					class="z-field min-w-0 flex-1 !h-[30px] max-md:text-base"
					onkeydown={(event) => {
						if (event.key === 'Enter') void addFolder();
					}}
				/>
				{@render parentSelect(newFolder.parentId, null, (next) => (newFolder.parentId = next))}
				<button type="button" class="btn-tactile !h-[30px] {newFolder.name.trim() ? 'btn-primary' : ''}" disabled={folderBusy || !newFolder.name.trim()} onclick={addFolder}>Create</button>
			</div>
		{/if}
	</div>
</section>

<RulesEditor
	data={rulesResource?.current}
	error={rulesResource?.error}
	mailboxes={mailboxesResource?.current}
	saving={savingRules}
	onSave={(next, takeOver) => void persistRules(next, takeOver)}
/>

<!-- Categories -->
<section class="z-card">
	<h2 class="z-card-head">Categories</h2>
	<div class="z-card-body">
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
				<input type="checkbox" class="z-check" checked={prefs.aiCategories} onchange={(event) => setPref('aiCategories', event.currentTarget.checked)} />
			</label>
		{/if}
	</div>
</section>

<!-- Reading prefs -->
<section class="z-card">
	<h2 class="z-card-head">Reading</h2>
	<div class="z-card-body">
		<p class={blurb}>These follow your account, so a new device starts where you left off.</p>

		<div class="mt-3.5 flex flex-col">
			<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
				<span class={rowLabel}>Mark messages read when opened</span>
				<input type="checkbox" class="z-check" checked={prefs.markReadOnOpen} onchange={(event) => setPref('markReadOnOpen', event.currentTarget.checked)} />
			</label>

			<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
				<span class={rowLabel}>Show preview line in the list</span>
				<input type="checkbox" class="z-check" checked={prefs.showPreview} onchange={(event) => setPref('showPreview', event.currentTarget.checked)} />
			</label>

			<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
				<span class={rowLabel}>Show sender avatars</span>
				<input type="checkbox" class="z-check" checked={prefs.showAvatars} onchange={(event) => setPref('showAvatars', event.currentTarget.checked)} />
			</label>

			<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
				<span>
					<span class="block {rowLabel}">Always show remote images</span>
					<span class="block text-[12px] text-[var(--z-muted)]">Off, pictures from the web wait for a click, so senders can't see when you open their mail.</span>
				</span>
				<input type="checkbox" class="z-check" checked={prefs.showRemoteImages} onchange={(event) => setPref('showRemoteImages', event.currentTarget.checked)} />
			</label>

			<label class="flex cursor-pointer items-center justify-between gap-4 border-t border-[var(--z-sunken)] py-[11px]">
				<span class={rowLabel}>Open folders on Unseen</span>
				<input type="checkbox" class="z-check" checked={prefs.unseenByDefault} onchange={(event) => setPref('unseenByDefault', event.currentTarget.checked)} />
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
	</div>

	<div class="z-card-foot">
		<button
			type="button"
			class="btn-tactile !h-7 !text-[12px]"
			onclick={() => {
				for (const key of Object.keys(DEFAULT_PREFS) as (keyof typeof DEFAULT_PREFS)[]) {
					setPref(key, DEFAULT_PREFS[key] as never);
				}
			}}
		>
			Reset to defaults
		</button>
	</div>
</section>

<!-- Notifications -->
<section class="z-card">
	<h2 class="z-card-head">Notifications</h2>
	<div class="z-card-body">
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
