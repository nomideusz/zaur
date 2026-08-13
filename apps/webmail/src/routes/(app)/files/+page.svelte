<script lang="ts">
	import { FileUpload } from '@ark-ui/svelte/file-upload';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import FileText from '$lib/components/icons/FileText.svelte';
	import Folder from '$lib/components/icons/Folder.svelte';
	import Image from '$lib/components/icons/Image.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import Users from '$lib/components/icons/Users.svelte';
	import FileDetailEmpty from '$lib/components/files/FileDetailEmpty.svelte';
	import FileDetailPanel from '$lib/components/files/FileDetailPanel.svelte';
	import FilesNameDialog from '$lib/components/files/FilesNameDialog.svelte';
	import FilesSidebar from '$lib/components/files/FilesSidebar.svelte';
	import ShareFileDialog from '$lib/components/files/ShareFileDialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import PaneSplit from '$lib/components/ui/PaneSplit.svelte';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import { PANE_SPLIT } from '$lib/components/ui/pane-split';
	import { fileNodeDragId, hasFileNodeDrag, setFileNodeDragData } from '$lib/files/drag';
	import { isImageFile } from '$lib/files/image';
	import { fileAllowsDelete, fileAllowsShare, formatFileSize } from '$lib/jmap/file-rights';
	import { auth } from '$lib/stores/auth.svelte';
	import { confirm } from '$lib/stores/confirm.svelte';
	import { files } from '$lib/stores/files.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import type { FileNode } from '$lib/types/files';
	import { cn } from '$lib/utils/cn';
	import { haptic } from '$lib/utils/haptics';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';

	let shareOpen = $state(false);
	let shareNodeId = $state<string | null>(null);
	let nameOpen = $state(false);
	let nameMode = $state<'folder' | 'rename'>('folder');
	let renameNodeId = $state<string | null>(null);
	let listQuery = $state('');

	const visibleNodes = $derived.by(() => {
		const q = listQuery.trim().toLowerCase();
		if (!q) return files.nodes;
		return files.nodes.filter((node) => node.name.toLowerCase().includes(q));
	});

	const selectedNode = $derived(files.selected);
	const folderImages = $derived(visibleNodes.filter((node) => isImageFile(node)));

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) return;
		void files.ensure(client);
	});

	$effect(() => {
		const generation = shellHeader.setPage({
			title: files.folderTitle,
			primaryAction: {
				kind: 'button',
				label: files.uploading ? 'Uploading…' : 'Upload',
				icon: Plus,
				onclick: () => document.getElementById('files-upload-input')?.click()
			}
		});
		return () => shellHeader.clearPage(generation);
	});

	function openFolder(id: string | null) {
		const client = auth.client;
		if (!client) return;
		if (supportsMobileListGestures()) haptic(8);
		void files.openFolder(client, id);
	}

	function onRowClick(node: FileNode) {
		if (supportsMobileListGestures()) haptic(8);
		if (node.nodeType === 'directory') {
			openFolder(node.id);
			return;
		}
		files.select(node.id);
	}

	function openShare(node: FileNode) {
		shareNodeId = node.id;
		shareOpen = true;
	}

	function openRename(node: FileNode) {
		renameNodeId = node.id;
		nameMode = 'rename';
		nameOpen = true;
	}

	function openNewFolder() {
		files.requestCreateFolder();
	}

	$effect(() => {
		if (files.createFolderOpen) {
			renameNodeId = null;
			nameMode = 'folder';
			nameOpen = true;
			files.createFolderOpen = false;
		}
	});

	$effect(() => {
		if (files.renameRequestId) {
			renameNodeId = files.renameRequestId;
			nameMode = 'rename';
			nameOpen = true;
			files.renameRequestId = null;
		}
	});

	async function submitName(name: string) {
		const client = auth.client;
		if (!client) throw new Error('Not connected');
		if (nameMode === 'folder') {
			await files.createFolder(client, name);
			return;
		}
		if (renameNodeId) await files.rename(client, renameNodeId, name);
	}

	async function removeNode(node: FileNode) {
		const client = auth.client;
		if (!client) return;
		const kind = node.nodeType === 'directory' ? 'folder' : 'file';
		if (
			!(await confirm.ask({
				title: `Delete ${kind}?`,
				description:
					node.nodeType === 'directory'
						? `Delete “${node.name}” and everything inside it?`
						: `Delete “${node.name}”?`,
				confirmLabel: 'Delete',
				tone: 'danger'
			}))
		) {
			return;
		}
		await files.destroy(client, node);
	}

	function onAccept(uploaded: File[]) {
		const client = auth.client;
		if (!client) return;
		void files.upload(client, uploaded);
	}

	function onFileDragStart(event: DragEvent, node: FileNode) {
		if (node.nodeType === 'directory' || !event.dataTransfer) return;
		setFileNodeDragData(event.dataTransfer, node.id);
	}

	function onFolderDragOver(event: DragEvent, folderId: string) {
		if (!hasFileNodeDrag(event.dataTransfer)) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		files.dropTargetId = folderId;
	}

	function onFolderDragLeave(event: DragEvent, folderId: string) {
		if (event.currentTarget instanceof HTMLElement && event.relatedTarget instanceof Node) {
			if (event.currentTarget.contains(event.relatedTarget)) return;
		}
		if (files.dropTargetId === folderId) files.dropTargetId = null;
	}

	function onFolderDrop(event: DragEvent, folderId: string) {
		if (!hasFileNodeDrag(event.dataTransfer)) return;
		event.preventDefault();
		event.stopPropagation();
		files.dropTargetId = null;
		const id = fileNodeDragId(event.dataTransfer);
		const client = auth.client;
		if (id && client) void files.move(client, id, folderId);
	}

	const renameTarget = $derived(renameNodeId ? files.nodeById(renameNodeId) : null);
</script>

<svelte:head>
	<title>{files.folderTitle} · Files · ZAUR</title>
</svelte:head>

{#if files.supported === false}
	<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 p-8">
		<div class="z-panel rounded-xl p-8 text-center">
			<FileText class="mx-auto size-10 text-fg-subtle" aria-hidden="true" />
			<h1 class="mt-4 text-2xl font-semibold text-fg">Files unavailable</h1>
			<p class="mx-auto mt-2 max-w-md text-sm text-fg-muted">
				Your mail server does not advertise JMAP File Storage yet. Shared documents will appear here
				once file storage is enabled on your account.
			</p>
			<div class="mt-6">
				<Button href={settings.preferredMailHref()} variant="ghost">Back to mail</Button>
			</div>
		</div>
	</div>
{:else}
	<PaneSplit
		storageKey={PANE_SPLIT.filesNav.key}
		defaultSize={PANE_SPLIT.filesNav.defaultSize}
		firstWidthVar="--width-sidebar"
		triggerLabel="Resize files sidebar"
	>
		{#snippet first()}
			<FilesSidebar class="flex" />
		{/snippet}
		{#snippet second()}
			<PaneSplit
				storageKey={PANE_SPLIT.filesList.key}
				defaultSize={PANE_SPLIT.filesList.defaultSize}
				firstId="list"
				secondId="detail"
				firstMin="18rem"
				firstMax="40rem"
				secondMin="40%"
				mobileFirst={selectedNode ? 'hide' : 'fill'}
				mobileSecond="hide"
				triggerLabel="Resize files list"
			>
				{#snippet first()}
					<FileUpload.Root
						class="z-mail-pane-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:border-r md:border-border"
						allowDrop
						preventDocumentDrop
						maxFiles={50}
						onFileAccept={(details) => onAccept(details.files)}
						disabled={!files.canAddHere || files.uploading}
					>
						<FileUpload.HiddenInput />
						<FileUpload.Context>
							{#snippet render()}
								<FileUpload.Dropzone disableClick>
									{#snippet asChild(dropzoneProps)}
						<section
							{...dropzoneProps()}
							class="z-files-dropzone relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
							style="view-transition-name: files-list;"
							aria-label="Files list"
						>
							<div class="z-pane-header hidden h-14 w-full shrink-0 items-center overflow-hidden border-b border-border/80 bg-surface px-4 md:flex">
								<nav class="flex min-w-0 items-center gap-1 text-sm" aria-label="Folder path">
									<button
										type="button"
										class="shrink-0 text-fg-muted hover:text-fg"
										onclick={() => openFolder(null)}
									>
										Files
									</button>
									{#each files.breadcrumb as crumb (crumb.id)}
										<ChevronRight class="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
										<button
											type="button"
											class="min-w-0 truncate font-semibold text-fg"
											onclick={() => openFolder(crumb.id)}
										>
											{crumb.name}
										</button>
									{/each}
								</nav>
							</div>

							<div class="hidden shrink-0 border-b border-border/80 px-4 py-3 md:block">
								<label class="relative block">
									<span class="sr-only">Filter files</span>
									<Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
									<input
										type="search"
										class="z-sidebar-search-input"
										placeholder="Filter this folder…"
										bind:value={listQuery}
									/>
								</label>
							</div>

							<ScrollArea pane class="min-h-0 flex-1">
								{#if files.loading && !files.nodes.length}
									<div class="px-4 py-12 text-center text-sm text-fg-muted">Loading files…</div>
								{:else if files.error}
									<div class="px-4 py-12 text-center text-sm text-danger">{files.error}</div>
								{:else if visibleNodes.length}
									<ul class="divide-y divide-border">
										{#each visibleNodes as node (node.id)}
											<li>
												<div
													role="group"
													class={cn(
														'z-list-row flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-sunken/60',
														selectedNode?.id === node.id && 'z-list-row--current',
														node.nodeType === 'directory' &&
															files.dropTargetId === node.id &&
															'z-folder-drop'
													)}
													draggable={node.nodeType !== 'directory'}
													ondragstart={(event) => onFileDragStart(event, node)}
													ondragover={(event) =>
														node.nodeType === 'directory' && onFolderDragOver(event, node.id)}
													ondragleave={(event) =>
														node.nodeType === 'directory' && onFolderDragLeave(event, node.id)}
													ondrop={(event) =>
														node.nodeType === 'directory' && onFolderDrop(event, node.id)}
												>
													<button
														type="button"
														class="flex min-w-0 flex-1 items-center gap-3 text-left"
														onclick={() => onRowClick(node)}
													>
														{#if node.nodeType === 'directory'}
															<Folder class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
														{:else if isImageFile(node)}
															<Image class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
														{:else}
															<FileText class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
														{/if}
														<div class="min-w-0 flex-1">
															<p class="truncate text-sm font-semibold tracking-tight text-fg">{node.name}</p>
															<p class="truncate text-xs text-fg-muted">
																{node.nodeType === 'directory'
																	? 'Folder'
																	: formatFileSize(node.size) || 'File'}
																{#if node.shareWith && Object.keys(node.shareWith).length}
																	· Shared
																{/if}
															</p>
														</div>
													</button>
													<OverflowMenu label="Actions for {node.name}" iconTriggerLabel="More">
														{#if fileAllowsShare(node) && auth.client?.hasPrincipals()}
															<OverflowMenuItem label="Share" onclick={() => openShare(node)}>
																{#snippet icon()}<Users class="size-4" />{/snippet}
															</OverflowMenuItem>
														{/if}
														{#if node.myRights.mayRename}
															<OverflowMenuItem label="Rename" onclick={() => openRename(node)} />
														{/if}
														{#if fileAllowsDelete(node)}
															<OverflowMenuItem
																label="Delete"
																danger
																onclick={() => void removeNode(node)}
															/>
														{/if}
													</OverflowMenu>
												</div>
											</li>
										{/each}
									</ul>
								{:else}
									<div class="flex flex-col items-center gap-3 px-4 py-12 text-center">
										<div class="rounded-full bg-accent/10 p-3 text-accent">
											<Folder class="size-6" aria-hidden="true" />
										</div>
										<div>
											<p class="text-sm font-semibold text-fg">
												{listQuery.trim() ? 'No files match this filter' : 'This folder is empty'}
											</p>
											<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">
												{files.canAddHere
													? 'Upload a file or create a folder to get started.'
													: 'You can browse files shared with you here.'}
											</p>
										</div>
										{#if files.canAddHere}
											<div class="flex flex-wrap justify-center gap-2">
												<Button onclick={() => document.getElementById('files-upload-input')?.click()}>
													Upload
												</Button>
												<Button variant="ghost" onclick={openNewFolder}>New folder</Button>
											</div>
										{/if}
									</div>
								{/if}
							</ScrollArea>
							<div class="z-files-drop-hint" aria-hidden="true">
								<p class="text-sm font-semibold text-fg">Drop files to upload</p>
							</div>
						</section>
									{/snippet}
								</FileUpload.Dropzone>
							{/snippet}
						</FileUpload.Context>
					</FileUpload.Root>
				{/snippet}
				{#snippet second()}
					{#if selectedNode}
						<FileDetailPanel
							chrome="pane"
							node={selectedNode}
							images={folderImages}
							onClose={() => files.select(null)}
							onShare={() => openShare(selectedNode)}
							onRename={() => openRename(selectedNode)}
							onRemove={() => void removeNode(selectedNode)}
							onSelectImage={(id) => files.select(id)}
						/>
					{:else}
						<FileDetailEmpty />
					{/if}
				{/snippet}
			</PaneSplit>
			{#if selectedNode}
				<FileDetailPanel
					chrome="sheet"
					node={selectedNode}
					images={folderImages}
					onClose={() => files.select(null)}
					onShare={() => openShare(selectedNode)}
					onRename={() => openRename(selectedNode)}
					onRemove={() => void removeNode(selectedNode)}
					onSelectImage={(id) => files.select(id)}
				/>
			{/if}
		{/snippet}
	</PaneSplit>
{/if}

<ShareFileDialog bind:open={shareOpen} nodeId={shareNodeId} />
<input
	id="files-upload-input"
	type="file"
	class="sr-only"
	multiple
	onchange={(event) => {
		const input = event.currentTarget;
		onAccept([...input.files ?? []]);
		input.value = '';
	}}
/>
<FilesNameDialog
	bind:open={nameOpen}
	title={nameMode === 'folder' ? 'New folder' : 'Rename'}
	confirmLabel={nameMode === 'folder' ? 'Create' : 'Save'}
	initialName={nameMode === 'rename' ? (renameTarget?.name ?? '') : ''}
	onSubmit={submitName}
/>
