<script lang="ts">
	import { messageOf } from '#lib/errors';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import type { MailboxDTO } from '#lib/mail/types';
	import { withoutBranch } from '#lib/mail/folders';
	import { whoami } from '../../../session.remote';
	import { createFolder, deleteFolder, mailboxes, updateFolder } from '../../../mail.remote';

	const who = whoami();
	const mailboxesResource = $derived(who.current ? mailboxes() : undefined);

	let status = $state<{ text: string; error?: boolean } | null>(null);

	// Your own folders, parents first; Inbox, Sent and the rest belong to the server. One is open for editing at a time.
	const folders = $derived((mailboxesResource?.current ?? []).filter((mailbox) => !mailbox.role));
	let editing = $state<{ id: string; name: string; parentId: string } | null>(null);
	let fresh = $state({ name: '', parentId: '' });
	let busy = $state(false);

	async function act(run: () => Promise<unknown>, done: string) {
		busy = true;
		status = null;
		try {
			await run();
			status = { text: done };
			return true;
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not change the folder'), error: true };
			return false;
		} finally {
			busy = false;
		}
	}

	async function add() {
		const name = fresh.name.trim();
		if (!name) return;
		if (await act(() => createFolder({ name, parentId: fresh.parentId || null }), `Created ${name}`)) {
			fresh = { name: '', parentId: '' };
		}
	}

	async function save() {
		const edit = editing;
		if (!edit) return;
		if (await act(() => updateFolder({ id: edit.id, name: edit.name, parentId: edit.parentId || null }), 'Folder saved')) {
			editing = null;
		}
	}

	async function remove(folder: MailboxDTO) {
		const inside = folder.total ? ` and its ${folder.total === 1 ? 'message' : `${folder.total} messages`}` : '';
		if (!confirm(`Delete “${folder.name}”${inside}? This can't be undone.`)) return;
		if (await act(() => deleteFolder({ id: folder.id }), `Deleted ${folder.name}`)) editing = null;
	}
</script>

<StatusNote {status} />

{#snippet parentSelect(value: string, self: MailboxDTO | null, onchange: (next: string) => void)}
	<select class="z-field min-w-0 !h-[30px]" aria-label="Inside" {value} onchange={(event) => onchange(event.currentTarget.value)}>
		<option value="">Top level</option>
		{#each withoutBranch(mailboxesResource?.current ?? [], self) as mailbox (mailbox.id)}
			<option value={mailbox.id}>{'   '.repeat(mailbox.depth)}{mailbox.name}</option>
		{/each}
	</select>
{/snippet}

<section class="z-card">
	<div class="z-card-head flex-wrap !py-2.5">
		<input
			type="text"
			maxlength="100"
			bind:value={fresh.name}
			placeholder="New folder"
			aria-label="New folder name"
			class="z-field min-w-0 flex-1 basis-[160px] !h-[30px] max-md:text-base"
			onkeydown={(event) => {
				if (event.key === 'Enter') void add();
			}}
		/>
		{@render parentSelect(fresh.parentId, null, (next) => (fresh.parentId = next))}
		<button type="button" class="btn-tactile !h-[30px] {fresh.name.trim() ? 'btn-primary' : ''}" disabled={busy || !fresh.name.trim()} onclick={add}>Create</button>
	</div>

	{#if mailboxesResource?.error}
		<p class="z-card-body text-[13px] text-[var(--z-ch-discard-ink)]">Could not load your folders.</p>
	{:else if !mailboxesResource?.current}
		<div class="z-card-body z-skeleton h-[80px]" aria-hidden="true"></div>
	{:else}
		<ul class="divide-y divide-[var(--z-hairline)] border-t border-[var(--z-hairline)]" role="list">
			{#each folders as folder (folder.id)}
				<li class="px-4 py-2">
					{#if editing?.id === folder.id}
						<div class="flex flex-wrap items-center gap-2">
							<input
								type="text"
								maxlength="100"
								bind:value={editing.name}
								aria-label="Folder name"
								class="z-field min-w-0 flex-1 basis-[160px] !h-[30px] max-md:text-base"
								onkeydown={(event) => {
									if (event.key === 'Enter') void save();
									if (event.key === 'Escape') editing = null;
								}}
							/>
							{@render parentSelect(editing.parentId, folder, (next) => editing && (editing.parentId = next))}
							<button type="button" class="btn-tactile btn-primary !h-[30px]" disabled={busy || !editing.name.trim()} onclick={save}>Save</button>
							<button type="button" class="btn-tactile !h-[30px]" onclick={() => (editing = null)}>Cancel</button>
							<button type="button" class="btn-tactile btn-danger !h-[30px]" disabled={busy} onclick={() => void remove(folder)}>Delete</button>
						</div>
					{:else}
						<div class="flex items-center justify-between gap-3" style:padding-left="{folder.depth * 16}px">
							<span class="min-w-0 truncate text-[13.5px] font-medium text-[var(--z-body)]">{folder.name}</span>
							<span class="flex shrink-0 items-center gap-2.5">
								<span class="z-mono text-[10.5px] text-[var(--z-soft)]">{folder.total}</span>
								<button
									type="button"
									class="btn-tactile !h-7 !text-[12px]"
									onclick={() => (editing = { id: folder.id, name: folder.name, parentId: folder.parentId ?? '' })}
								>
									Edit
								</button>
							</span>
						</div>
					{/if}
				</li>
			{:else}
				<li class="px-4 py-3 text-[12.5px] text-[var(--z-muted)]">No folders of your own yet.</li>
			{/each}
		</ul>
	{/if}
</section>
