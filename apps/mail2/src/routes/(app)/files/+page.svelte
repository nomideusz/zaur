<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fileRoleLabel, type FileNode } from '@zaur/mail-core';
	import SectionShell from '#lib/components/mail/SectionShell.svelte';
	import AttachmentPreview from '#lib/components/mail/AttachmentPreview.svelte';
	import { messageOf } from '#lib/errors';
	import { MAX_ATTACHMENT_BYTES, attachmentKind, uploadFile } from '#lib/compose/attachments';
	import { attachmentBadge } from '#lib/mail/colors';
	import { withoutBranch } from '#lib/mail/folders';
	import { attachmentUrl, formatBytes, previewKind } from '#lib/mail/rows';
	import { whoami } from '../../session.remote';
	import { addFile, createFileFolder, deleteFile, fileFolders, folder, updateFile } from '../../files.remote';

	/**
	 * Files: one folder at a time, its address in `?folder=` so Back walks up
	 * the way you came. Folders open, files preview (or download when there is
	 * nothing to preview), and anything dropped on the list uploads into it.
	 */

	const who = whoami();
	const session = $derived(who.current ?? null);

	$effect(() => {
		if (who.ready && !who.current) goto('/login', { replaceState: true });
	});

	const folderId = $derived(page.url.searchParams.get('folder'));
	const resource = $derived(session ? folder({ id: folderId }) : undefined);
	const view = $derived(resource?.current ?? null);
	const items = $derived(view?.items ?? []);
	const path = $derived(view?.path ?? []);

	let editing = $state<{ id: string; name: string; parentId: string } | null>(null);
	/** Every folder, only fetched once something is being moved. */
	const foldersResource = $derived(editing ? fileFolders() : undefined);
	let newFolder = $state<string | null>(null);
	let busy = $state(false);
	let uploading = $state<string | null>(null);
	let notice = $state<string | null>(null);
	let dragging = $state(false);
	let previewAt = $state<number | null>(null);
	let picker = $state<HTMLInputElement>();

	// A different folder closes whatever was open in the last one.
	$effect(() => {
		void folderId;
		editing = null;
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
	const folderHref = (id: string | null) => (id ? `/files?folder=${encodeURIComponent(id)}` : '/files');
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
		const made = await run(() => createFileFolder({ parentId: folderId, name }), `Created “${name}”`, 'The folder could not be created.');
		if (made) newFolder = null;
	}

	async function save() {
		const edit = editing;
		if (!edit) return;
		const saved = await run(
			() => updateFile({ id: edit.id, name: edit.name, parentId: edit.parentId || null }),
			'Saved',
			'That could not be changed.'
		);
		if (saved) editing = null;
	}

	async function remove(node: FileNode) {
		const what = isFolder(node) ? `the folder “${node.name}” and everything in it` : `“${node.name}”`;
		if (!confirm(`Delete ${what}?`)) return;
		if (await run(() => deleteFile({ id: node.id }), `Deleted “${node.name}”`, 'That could not be deleted.')) editing = null;
	}

	// ponytail: 25 MB a file, /api/upload's body limit; stream it through when Files needs bigger.
	async function upload(files: File[]) {
		const into = folderId;
		let done = 0;
		for (const file of files) {
			uploading = files.length > 1 ? `Uploading ${done + 1} of ${files.length}…` : `Uploading “${file.name}”…`;
			try {
				if (file.size > MAX_ATTACHMENT_BYTES) throw new Error(`“${file.name}” is over 25 MB`);
				const blob = await uploadFile(file);
				await addFile({ parentId: into, blobId: blob.blobId, name: file.name, type: blob.type });
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

<SectionShell title="Files">
	{#snippet controls()}
		<button type="button" class="btn-tactile gap-1.5" disabled={!view?.supported || busy} onclick={() => (newFolder = '')}>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
			</svg>
			<span class="max-md:sr-only">New folder</span>
		</button>
		<button type="button" class="btn-tactile btn-primary" disabled={!view?.supported || !!uploading} onclick={() => picker?.click()}>
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
			if (!view?.supported || !event.dataTransfer?.types.includes('Files')) return;
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
		<div class="flex min-h-[45px] items-center gap-3 border-b border-[var(--z-hairline)] px-4 py-2.5">
			<nav class="flex min-w-0 items-center gap-1.5 text-[13px]" aria-label="Folder path">
				{#each [{ id: null, name: 'All files' }, ...path] as crumb, at (crumb.id)}
					{#if at > 0}<span class="text-[var(--z-faint)]" aria-hidden="true">/</span>{/if}
					{#if at === path.length}
						<span class="truncate font-semibold text-[var(--z-ink)]" aria-current="page">{crumb.name}</span>
					{:else}
						<a href={folderHref(crumb.id)} class="truncate font-medium text-[var(--z-muted)] hover:text-[var(--z-ink)] hover:underline">{crumb.name}</a>
					{/if}
				{/each}
			</nav>
			{#if uploading || notice}
				<span class="ml-auto truncate text-[12px] font-medium text-[var(--z-muted)]" role="status">{uploading ?? notice}</span>
			{/if}
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto">
			{#if resource?.error}
				<div class="p-6 text-center text-[13px] text-[var(--z-ch-discard-ink)]">
					{messageOf(resource.error, 'Could not load your files.')}
					<div class="mt-3 flex justify-center gap-2">
						<button type="button" class="btn-tactile !h-[28px]" onclick={() => resource?.refresh()}>Retry</button>
						{#if folderId}<a href="/files" class="btn-tactile !h-[28px]">All files</a>{/if}
					</div>
				</div>
			{:else if !view}
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
					{#each items as node (node.id)}
						{@const at = previewable.findIndex((item) => item.blobId === node.blobId)}
						<li class="border-b border-[var(--z-sunken)]">
							{#if editing?.id === node.id}
								<div class="flex flex-wrap items-center gap-2 px-4 py-2">
									{@render glyph(node)}
									<input
										type="text"
										maxlength="255"
										bind:value={editing.name}
										aria-label="Name"
										class="z-field min-w-0 flex-1 !h-[30px] max-md:text-base"
										{@attach (input) => input.focus()}
										onkeydown={(event) => {
											if (event.key === 'Enter') void save();
											if (event.key === 'Escape') editing = null;
										}}
									/>
									<select
										class="z-field min-w-0 !h-[30px]"
										aria-label="Inside"
										value={editing.parentId}
										disabled={!foldersResource?.current}
										onchange={(event) => editing && (editing.parentId = event.currentTarget.value)}
									>
										<option value="">All files</option>
										{#each withoutBranch(foldersResource?.current ?? [], isFolder(node) ? node : null) as choice (choice.id)}
											<option value={choice.id}>{'   '.repeat(choice.depth)}{choice.name}</option>
										{/each}
									</select>
									<button type="button" class="btn-tactile btn-primary !h-[30px]" disabled={busy || !editing.name.trim()} onclick={save}>Save</button>
									<button type="button" class="btn-tactile !h-[30px]" onclick={() => (editing = null)}>Cancel</button>
									<button type="button" class="btn-tactile btn-danger !h-[30px]" disabled={busy} onclick={() => void remove(node)}>Delete</button>
								</div>
							{:else}
								<div class="flex items-center gap-3 px-4 hover:bg-[var(--z-hover)]">
									{#snippet row()}
										{@render glyph(node)}
										<span class="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[var(--z-ink)]">{fileRoleLabel(node.role) ?? node.name}</span>
									{/snippet}
									{#if isFolder(node)}
										<a href={folderHref(node.id)} class={rowLink}>{@render row()}</a>
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
									<button
										type="button"
										class="btn-tactile !h-7 shrink-0 !text-[12px]"
										aria-label="Edit {node.name}"
										onclick={() => (editing = { id: node.id, name: node.name, parentId: node.parentId ?? '' })}
									>
										Edit
									</button>
								</div>
							{/if}
						</li>
					{:else}
						{#if newFolder === null}
							<li class="p-8 text-center text-[13px] text-[var(--z-soft)]">
								{folderId ? 'This folder is empty.' : 'No files yet.'} Drop files here, or use Upload.
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
