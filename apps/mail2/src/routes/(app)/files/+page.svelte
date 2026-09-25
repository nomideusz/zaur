<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fileRoleLabel, type FileNode, type FileShareRole } from '@zaur/mail-core';
	import SectionShell from '#lib/components/mail/SectionShell.svelte';
	import AttachmentPreview from '#lib/components/mail/AttachmentPreview.svelte';
	import { messageOf } from '#lib/errors';
	import { attachmentKind, uploadFile } from '#lib/compose/attachments';
	import { attachmentBadge } from '#lib/mail/colors';
	import { withoutBranch } from '#lib/mail/folders';
	import { attachmentUrl, formatBytes, previewKind } from '#lib/mail/rows';
	import { whoami } from '../../session.remote';
	import {
		addFile,
		createFileFolder,
		deleteFile,
		fileFolders,
		fileSharing,
		folder,
		searchFiles,
		shareFile,
		unshareFile,
		updateFile
	} from '../../files.remote';

	/**
	 * Files: one folder at a time, its address in `?folder=` (and `&account=`
	 * for a folder someone shared) so Back walks up the way you came. Folders
	 * open, files preview (or download when there is nothing to preview), and
	 * anything dropped on the list uploads into it. What others share with you
	 * sits at the top level under your own; the search looks through both.
	 */

	const who = whoami();
	const session = $derived(who.current ?? null);

	$effect(() => {
		if (who.ready && !who.current) goto('/login', { replaceState: true });
	});

	const folderId = $derived(page.url.searchParams.get('folder'));
	/** Whose the open folder is: `null` for your own. */
	const accountId = $derived(folderId ? page.url.searchParams.get('account') : null);
	const resource = $derived(session ? folder({ id: folderId, account: accountId }) : undefined);
	const view = $derived(resource?.current ?? null);
	const canAdd = $derived(!!view?.supported && view.canAdd);
	const path = $derived(view?.path ?? []);

	let query = $state('');
	let searched = $state('');
	$effect(() => {
		const text = query.trim();
		const timer = setTimeout(() => (searched = text), 250);
		return () => clearTimeout(timer);
	});
	const searching = $derived(!!query.trim());
	const results = $derived(session && searched ? searchFiles({ text: searched }) : undefined);
	const items = $derived(searching ? (results?.current ?? []) : (view?.items ?? []));

	let editing = $state<{ id: string; account: string | null; name: string; parentId: string } | null>(null);
	/** Every folder in the account, only fetched once something is being moved. */
	const foldersResource = $derived(editing ? fileFolders({ account: editing.account }) : undefined);
	let sharing = $state<{ id: string; account: string | null } | null>(null);
	const sharingResource = $derived(sharing ? fileSharing({ id: sharing.id, account: sharing.account }) : undefined);
	let shareEmail = $state('');
	let shareRole = $state<FileShareRole>('read');
	let newFolder = $state<string | null>(null);
	let busy = $state(false);
	let uploading = $state<string | null>(null);
	let notice = $state<string | null>(null);
	let dragging = $state(false);
	let previewAt = $state<number | null>(null);
	let picker = $state<HTMLInputElement>();

	// A different folder, or a search, closes whatever was open in the last one.
	$effect(() => {
		void folderId;
		void searching;
		editing = null;
		sharing = null;
		newFolder = null;
		previewAt = null;
	});

	const isFolder = (node: FileNode) => node.nodeType === 'directory';
	const asAttachment = (node: FileNode) => ({
		blobId: node.blobId ?? '',
		name: node.name,
		type: node.type || 'application/octet-stream',
		size: node.size ?? 0
	});
	const previewable = $derived(
		items.filter((node) => node.blobId && previewKind(asAttachment(node))).map(asAttachment)
	);
	const folderHref = (id: string | null, account: string | null = null) =>
		id ? `/files?${new URLSearchParams({ folder: id, ...(account && { account }) })}` : '/files';
	const isShared = (node: FileNode) => Object.keys(node.shareWith ?? {}).length > 0;
	const day = (iso: string | null) =>
		iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

	function say(text: string) {
		notice = text;
		setTimeout(() => {
			if (notice === text) notice = null;
		}, 3000);
	}

	async function run(action: () => Promise<unknown>, done: string, failed: string): Promise<boolean> {
		busy = true;
		try {
			await action();
			say(done);
			return true;
		} catch (cause) {
			say(messageOf(cause, failed));
			return false;
		} finally {
			busy = false;
		}
	}

	async function createFolder() {
		const name = newFolder?.trim();
		if (!name) return;
		const made = await run(
			() => createFileFolder({ parentId: folderId, account: accountId, name }),
			`Created “${name}”`,
			'The folder could not be created.'
		);
		if (made) newFolder = null;
	}

	async function save() {
		const edit = editing;
		if (!edit) return;
		const saved = await run(
			() => updateFile({ id: edit.id, account: edit.account, name: edit.name, parentId: edit.parentId || null }),
			'Saved',
			'That could not be changed.'
		);
		if (saved) editing = null;
	}

	async function remove(node: FileNode) {
		const what = isFolder(node) ? `the folder “${node.name}” and everything in it` : `“${node.name}”`;
		if (!confirm(`Delete ${what}?`)) return;
		if (await run(() => deleteFile({ id: node.id, account: node.accountId }), `Deleted “${node.name}”`, 'That could not be deleted.')) {
			editing = null;
		}
	}

	async function share(event: SubmitEvent) {
		event.preventDefault();
		const target = sharing;
		const email = shareEmail.trim();
		if (!target || !email) return;
		busy = true;
		try {
			const { name, notified } = await shareFile({ ...target, email, role: shareRole });
			shareEmail = '';
			say(notified ? `Shared with ${name}` : `Shared with ${name}, but the email telling them could not be sent`);
		} catch (cause) {
			say(messageOf(cause, 'That could not be shared.'));
		} finally {
			busy = false;
		}
	}

	const changeRole = (principalId: string, role: FileShareRole) =>
		sharing && run(() => shareFile({ ...sharing!, principalId, role }), 'Access changed', 'The access could not be changed.');
	const unshare = (principalId: string) =>
		sharing && run(() => unshareFile({ ...sharing!, principalId }), 'Access removed', 'The access could not be removed.');

	// ponytail: one upload a file, so the server's maxSizeUpload (50 MB on Stalwart) is the ceiling;
	// bigger means Blob/upload chunking, which Stalwart caps at 7.5 MB a blob, or WebDAV.
	async function upload(files: File[]) {
		const into = folderId;
		const account = accountId;
		const max = view?.maxUpload ?? Infinity;
		let done = 0;
		for (const file of files) {
			uploading = files.length > 1 ? `Uploading ${done + 1} of ${files.length}…` : `Uploading “${file.name}”…`;
			try {
				if (file.size > max) throw new Error(`“${file.name}” is over ${formatBytes(max)}`);
				const blob = await uploadFile(file);
				await addFile({ parentId: into, account, blobId: blob.blobId, name: file.name, type: blob.type });
				done += 1;
			} catch (cause) {
				say(messageOf(cause, `“${file.name}” could not be uploaded.`));
			}
		}
		uploading = null;
		if (done === files.length) say(done === 1 ? `Uploaded “${files[0]!.name}”` : `Uploaded ${done} files`);
	}

	const rowLink = 'flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left';
</script>

<svelte:head><title>Files · Zaur Mail</title></svelte:head>

{#snippet glyph(node: FileNode)}
	{#if isFolder(node)}
		<svg class="size-[22px] shrink-0 text-[var(--z-soft)]" viewBox="0 0 22 22" fill="none" aria-hidden="true">
			<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2h7A1.5 1.5 0 0 1 19 8.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 16.5v-10Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
		</svg>
	{:else}
		{@const badge = attachmentBadge(node.type ?? '')}
		<span
			aria-hidden="true"
			class="flex size-[22px] shrink-0 items-center justify-center rounded-[5px] border text-[8px] font-bold uppercase"
			style:background-color={badge.bg}
			style:border-color={badge.border}
			style:color={badge.text}
		>
			{attachmentKind(node.name, node.type ?? '').slice(0, 4)}
		</span>
	{/if}
{/snippet}

{#snippet searchField(className: string)}
	<input
		type="search"
		bind:value={query}
		placeholder="Search files…"
		aria-label="Search files"
		class="z-field {className}"
		onkeydown={(event) => event.key === 'Escape' && (query = '')}
	/>
{/snippet}

{#snippet sharePanel(node: FileNode)}
	{@const people = sharingResource?.current}
	<div class="space-y-2 px-4 pb-3 md:pl-[50px]">
		<p class="z-caption">Shared with</p>
		{#if sharingResource?.error}
			<p class="text-[12.5px] text-[var(--z-ch-discard-ink)]">{messageOf(sharingResource.error, 'Could not load who this is shared with.')}</p>
		{:else if !people}
			<div class="z-skeleton h-[30px] rounded-[8px] bg-[var(--z-sunken)]" aria-hidden="true"></div>
		{:else if !people.length}
			<p class="text-[12.5px] text-[var(--z-soft)]">Nobody yet — only you can see it.</p>
		{:else}
			<ul role="list" class="space-y-1.5">
				{#each people as person (person.principalId)}
					<li class="flex flex-wrap items-center gap-2">
						<span class="min-w-0 flex-1 truncate text-[13px] text-[var(--z-ink)]">
							{person.name || person.email || person.principalId}
							{#if person.name && person.email}<span class="z-mono text-[11px] text-[var(--z-soft)]">{person.email}</span>{/if}
						</span>
						<select
							class="z-field !h-[30px]"
							aria-label="What {person.name || person.email || 'they'} may do"
							value={person.role}
							disabled={busy}
							onchange={(event) => void changeRole(person.principalId, event.currentTarget.value as FileShareRole)}
						>
							<option value="read">Can view</option>
							<option value="write">Can edit</option>
						</select>
						<button type="button" class="btn-tactile !h-[30px]" disabled={busy} onclick={() => void unshare(person.principalId)}>Remove</button>
					</li>
				{/each}
			</ul>
		{/if}
		<form class="flex flex-wrap items-center gap-2" onsubmit={share}>
			<input
				type="email"
				bind:value={shareEmail}
				placeholder="Their address on this server"
				aria-label="Share with"
				class="z-field min-w-0 flex-1 !h-[30px] max-md:text-base"
				{@attach (input) => input.focus()}
				onkeydown={(event) => event.key === 'Escape' && (sharing = null)}
			/>
			<select class="z-field !h-[30px]" aria-label="What they may do" bind:value={shareRole}>
				<option value="read">Can view</option>
				<option value="write">Can edit</option>
			</select>
			<button type="submit" class="btn-tactile btn-primary !h-[30px]" disabled={busy || !shareEmail.trim()}>Share</button>
			<button type="button" class="btn-tactile !h-[30px]" onclick={() => (sharing = null)}>Done</button>
		</form>
	</div>
{/snippet}

<SectionShell title="Files">
	{#snippet controls()}
		<div class="relative flex items-center max-md:hidden">
			<svg class="pointer-events-none absolute left-2.5 size-3.5 text-[var(--z-faint)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
				<path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
			{@render searchField('w-[240px] !pl-8')}
		</div>
		<button type="button" class="btn-tactile gap-1.5" disabled={!canAdd || busy} onclick={() => (newFolder = '')}>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
			</svg>
			<span class="max-md:sr-only">New folder</span>
		</button>
		<button type="button" class="btn-tactile btn-primary" disabled={!canAdd || !!uploading} onclick={() => picker?.click()}>
			Upload
		</button>
		<input
			bind:this={picker}
			type="file"
			multiple
			hidden
			onchange={(event) => {
				const files = [...(event.currentTarget.files ?? [])];
				event.currentTarget.value = '';
				if (files.length) void upload(files);
			}}
		/>
	{/snippet}

	<div
		class="flex min-h-0 flex-1 flex-col transition-colors {dragging ? 'bg-[var(--z-accent-tint)]' : ''}"
		role="region"
		aria-label="Files in this folder"
		ondragover={(event) => {
			if (!canAdd || searching || !event.dataTransfer?.types.includes('Files')) return;
			event.preventDefault();
			dragging = true;
		}}
		ondragleave={(event) => {
			if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dragging = false;
		}}
		ondrop={(event) => {
			if (!dragging) return;
			event.preventDefault();
			dragging = false;
			const files = [...(event.dataTransfer?.files ?? [])];
			if (files.length) void upload(files);
		}}
	>
		<div class="border-b border-[var(--z-hairline)] px-4 py-2.5 md:hidden">
			{@render searchField('w-full max-md:text-base')}
		</div>
		<div class="flex min-h-[45px] items-center gap-3 border-b border-[var(--z-hairline)] px-4 py-2.5">
			{#if searching}
				<span class="truncate text-[13px] font-semibold text-[var(--z-ink)]" aria-live="polite">
					{results?.current ? `${items.length >= 50 ? '50+' : items.length} found` : 'Searching…'}
				</span>
			{:else}
				<nav class="flex min-w-0 items-center gap-1.5 text-[13px]" aria-label="Folder path">
					{#each [{ id: null, name: 'All files' }, ...path] as crumb, at (crumb.id)}
						{#if at > 0}<span class="text-[var(--z-faint)]" aria-hidden="true">/</span>{/if}
						{#if at === path.length}
							<span class="truncate font-semibold text-[var(--z-ink)]" aria-current="page">{crumb.name}</span>
						{:else}
							<a
								href={folderHref(crumb.id, accountId)}
								class="truncate font-medium text-[var(--z-muted)] hover:text-[var(--z-ink)] hover:underline"
							>
								{crumb.name}
							</a>
						{/if}
					{/each}
				</nav>
				{#if accountId && view}
					<span class="shrink-0 truncate text-[12px] text-[var(--z-soft)]">Shared by {view.owners[accountId] ?? 'someone else'}</span>
				{/if}
			{/if}
			{#if uploading || notice}
				<span class="ml-auto truncate text-[12px] font-medium text-[var(--z-muted)]" role="status">{uploading ?? notice}</span>
			{/if}
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto">
			{#if (searching ? results : resource)?.error}
				{@const failed = (searching ? results : resource)?.error}
				<div class="p-6 text-center text-[13px] text-[var(--z-ch-discard-ink)]">
					{messageOf(failed, searching ? 'The search failed.' : 'Could not load your files.')}
					<div class="mt-3 flex justify-center gap-2">
						<button type="button" class="btn-tactile !h-[28px]" onclick={() => (searching ? results : resource)?.refresh()}>Retry</button>
						{#if folderId && !searching}<a href="/files" class="btn-tactile !h-[28px]">All files</a>{/if}
					</div>
				</div>
			{:else if !view || (searching && !results?.current)}
				<ul class="space-y-1 p-3" aria-hidden="true">
					{#each [1, 2, 3, 4, 5] as n (n)}<li class="z-skeleton h-[40px] rounded-[8px] bg-[var(--z-sunken)]"></li>{/each}
				</ul>
			{:else if !view.supported}
				<p class="p-6 text-[13px] leading-relaxed text-[var(--z-soft)]">
					This mail server does not offer file storage over JMAP, so there is nothing to show here.
				</p>
			{:else}
				<ul role="list">
					{#if newFolder !== null}
						<li class="flex flex-wrap items-center gap-2 border-b border-[var(--z-sunken)] px-4 py-2">
							{@render glyph({ nodeType: 'directory' } as FileNode)}
							<input
								type="text"
								maxlength="255"
								bind:value={newFolder}
								placeholder="Folder name"
								aria-label="New folder name"
								class="z-field min-w-0 flex-1 !h-[30px] max-md:text-base"
								{@attach (input) => input.focus()}
								onkeydown={(event) => {
									if (event.key === 'Enter') void createFolder();
									if (event.key === 'Escape') newFolder = null;
								}}
							/>
							<button type="button" class="btn-tactile btn-primary !h-[30px]" disabled={busy || !newFolder.trim()} onclick={createFolder}>Create</button>
							<button type="button" class="btn-tactile !h-[30px]" onclick={() => (newFolder = null)}>Cancel</button>
						</li>
					{/if}
					{#each items as node, index (`${node.accountId ?? ''}/${node.id}`)}
						{@const at = previewable.findIndex((item) => item.blobId === node.blobId)}
						{@const owner = node.accountId ? view.owners[node.accountId] : null}
						{#if !searching && !folderId && node.accountId && !items[index - 1]?.accountId}
							<li class="z-caption px-4 pt-4 pb-1.5">Shared with you</li>
						{/if}
						<li class="border-b border-[var(--z-sunken)]">
							{#if editing?.id === node.id && editing.account === node.accountId}
								<div class="flex flex-wrap items-center gap-2 px-4 py-2">
									{@render glyph(node)}
									<input
										type="text"
										maxlength="255"
										bind:value={editing.name}
										aria-label="Name"
										class="z-field min-w-0 flex-1 !h-[30px] max-md:text-base"
										disabled={!node.myRights.mayRename}
										{@attach (input) => input.focus()}
										onkeydown={(event) => {
											if (event.key === 'Enter') void save();
											if (event.key === 'Escape') editing = null;
										}}
									/>
									{#if node.myRights.mayRename}
										<select
											class="z-field min-w-0 !h-[30px]"
											aria-label="Inside"
											value={editing.parentId}
											disabled={!foldersResource?.current}
											onchange={(event) => editing && (editing.parentId = event.currentTarget.value)}
										>
											<option value="">{owner ? `${owner}’s files` : 'All files'}</option>
											{#each withoutBranch(foldersResource?.current ?? [], isFolder(node) ? node : null) as choice (choice.id)}
												<option value={choice.id}>{'   '.repeat(choice.depth)}{choice.name}</option>
											{/each}
										</select>
										<button type="button" class="btn-tactile btn-primary !h-[30px]" disabled={busy || !editing.name.trim()} onclick={save}>Save</button>
									{/if}
									<button type="button" class="btn-tactile !h-[30px]" onclick={() => (editing = null)}>Cancel</button>
									{#if node.myRights.mayDelete}
										<button type="button" class="btn-tactile btn-danger !h-[30px]" disabled={busy} onclick={() => void remove(node)}>Delete</button>
									{/if}
								</div>
							{:else}
								<div class="flex items-center gap-3 px-4 hover:bg-[var(--z-hover)]">
									{#snippet row()}
										{@render glyph(node)}
										<span class="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[var(--z-ink)]">
											{fileRoleLabel(node.role) ?? node.name}
											{#if owner && (searching || !folderId)}<span class="ml-1.5 text-[12px] font-normal text-[var(--z-soft)]">{owner}</span>{/if}
										</span>
										{#if isShared(node)}<span class="z-chip" title="Shared with other people">Shared</span>{/if}
									{/snippet}
									{#if isFolder(node)}
										<a href={folderHref(node.id, node.accountId)} class={rowLink}>{@render row()}</a>
									{:else if at >= 0}
										<button type="button" class={rowLink} title="Open {node.name}" onclick={() => (previewAt = at)}>{@render row()}</button>
									{:else}
										<a href={attachmentUrl(node.blobId ?? '', node.name, node.type ?? '')} download={node.name} class={rowLink} title="Download {node.name}">
											{@render row()}
										</a>
									{/if}
									<span class="shrink-0 text-[12px] text-[var(--z-soft)] tabular-nums max-md:hidden">{day(node.modified)}</span>
									<span class="z-mono w-[64px] shrink-0 text-right text-[10.5px] text-[var(--z-soft)]">
										{isFolder(node) ? '' : formatBytes(node.size ?? 0)}
									</span>
									{#if searching}
										{#if !node.accountId}
											<a href={folderHref(node.parentId)} class="btn-tactile !h-7 shrink-0 !text-[12px]" title="Open the folder it is in">Folder</a>
										{/if}
									{:else}
										{#if node.myRights.mayShare}
											<button
												type="button"
												class="btn-tactile !h-7 shrink-0 !text-[12px]"
												aria-label="Share {node.name}"
												aria-expanded={sharing?.id === node.id}
												onclick={() => {
													editing = null;
													shareEmail = '';
													shareRole = 'read';
													sharing = sharing?.id === node.id ? null : { id: node.id, account: node.accountId };
												}}
											>
												Share
											</button>
										{/if}
										{#if node.myRights.mayRename || node.myRights.mayDelete}
											<button
												type="button"
												class="btn-tactile !h-7 shrink-0 !text-[12px]"
												aria-label="Edit {node.name}"
												onclick={() => {
													sharing = null;
													editing = { id: node.id, account: node.accountId, name: node.name, parentId: node.parentId ?? '' };
												}}
											>
												Edit
											</button>
										{/if}
									{/if}
								</div>
								{#if sharing?.id === node.id && sharing.account === node.accountId}
									{@render sharePanel(node)}
								{/if}
							{/if}
						</li>
					{:else}
						{#if newFolder === null}
							<li class="p-8 text-center text-[13px] text-[var(--z-soft)]">
								{#if searching}
									Nothing called “{query.trim()}”.
								{:else}
									{folderId ? 'This folder is empty.' : 'No files yet.'}
									{canAdd ? 'Drop files here, or use Upload.' : ''}
								{/if}
							</li>
						{/if}
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</SectionShell>

{#if previewAt !== null && previewable.length > 0}
	<AttachmentPreview items={previewable} bind:index={previewAt} onClose={() => (previewAt = null)} />
{/if}
