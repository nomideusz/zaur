<script lang="ts">
	import FileText from '$lib/components/icons/FileText.svelte';
	import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import Download from '$lib/components/icons/Download.svelte';
	import X from '$lib/components/icons/X.svelte';
	import {
		attachmentDisplayName,
		attachmentIsOpaqueName
	} from '$lib/attachments/display-name';
	import { downloadAttachment, getAttachmentBlob } from '$lib/attachments/download';
	import { toast } from '$lib/stores/toast.svelte';
	import type { MessageAttachment } from '$lib/types/mail';
	import { portal } from '$lib/utils/portal';
	import { PdfViewer } from '$lib/components/ui/pdf-viewer';

	interface Props {
		attachments: MessageAttachment[];
	}

	let { attachments }: Props = $props();

	/** Above this count, the list stays folded until the user expands it. */
	const COLLAPSE_THRESHOLD = 4;

	let downloadingId = $state<string | null>(null);
	let expanded = $state(false);

	let activePreviewAttachment = $state<MessageAttachment | null>(null);
	let previewBlob = $state<Blob | null>(null);

	const canCollapse = $derived(attachments.length > COLLAPSE_THRESHOLD);

	function formatSize(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function attachmentLabel(count: number) {
		return count === 1 ? '1 attachment' : `${count} attachments`;
	}

	function isPdfAttachment(attachment: MessageAttachment) {
		return attachment.type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf');
	}

	async function handleAttachmentClick(attachment: MessageAttachment) {
		const isPdf = isPdfAttachment(attachment);
		downloadingId = attachment.blobId;
		try {
			if (isPdf) {
				const blob = await getAttachmentBlob(attachment);
				previewBlob = blob;
				activePreviewAttachment = attachment;
			} else {
				await downloadAttachment(attachment);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : (isPdf ? 'Failed to load preview' : 'Download failed');
			toast.show(message, 'error');
		} finally {
			downloadingId = null;
		}
	}

	async function handleDownload(attachment: MessageAttachment) {
		try {
			await downloadAttachment(attachment);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Download failed';
			toast.show(message, 'error');
		}
	}

	function closePreview() {
		previewBlob = null;
		activePreviewAttachment = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && activePreviewAttachment) {
			closePreview();
		}
	}

</script>

<svelte:window onkeydown={handleKeydown} />

<section class="z-reader-attachments" aria-label={attachmentLabel(attachments.length)}>
	<div class="z-reader-attachments__head">
		<p class="z-reader-section-label">{attachmentLabel(attachments.length)}</p>
		{#if canCollapse}
			<button
				type="button"
				class="z-reader-link"
				aria-expanded={expanded}
				onclick={() => (expanded = !expanded)}
			>
				{expanded ? 'Hide' : 'Show all'}
			</button>
		{/if}
	</div>

	{#if !canCollapse || expanded}
		<ul class="z-reader-attachment-list">
			{#each attachments as attachment (attachment.blobId)}
				{@const displayName = attachmentDisplayName(attachment.name, attachment.type)}
				{@const opaqueName = attachmentIsOpaqueName(attachment.name)}
				{@const isPdf = isPdfAttachment(attachment)}
				<li>
					<button
						type="button"
						class="z-reader-attachment-item"
						title={isPdf ? `Preview ${attachment.name}` : (opaqueName ? `${attachment.name} — download` : `Download ${attachment.name}`)}
						aria-label={isPdf ? `Preview ${displayName}` : `Download ${displayName}`}
						disabled={downloadingId === attachment.blobId}
						onclick={() => handleAttachmentClick(attachment)}
					>
						{#if downloadingId === attachment.blobId}
							<span class="z-spinner size-4 shrink-0 text-fg-muted" aria-hidden="true">
								<LoaderCircle class="size-full" />
							</span>
						{:else}
							<FileText class="z-reader-attachment-icon" aria-hidden="true" />
						{/if}
						<span class="z-reader-attachment-copy">
							<span class="z-reader-attachment-name">{displayName}</span>
							<span class="z-reader-attachment-meta">
								{#if attachment.size}
									<span class="z-reader-attachment-size">{formatSize(attachment.size)}</span>
								{/if}
								<span class="z-reader-attachment-action">{isPdf ? 'Preview' : 'Download'}</span>
							</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

{#if activePreviewAttachment && previewBlob}
	<!-- Backdrop wrapper -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		use:portal
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 md:p-8"
		onpointerdown={closePreview}
	>
		<!-- Modal wrapper container that stops event propagation -->
		<div
			class="w-full max-w-5xl h-[90vh] flex flex-col"
			onpointerdown={(e) => e.stopPropagation()}
		>
			<PdfViewer.Root
				src={previewBlob}
				class="w-full h-full bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
			>
				<!-- Top Header bar -->
				<div class="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-surface-raised shrink-0">
					<div class="flex items-center gap-3 min-w-0">
						<span class="px-2 py-0.5 text-xs font-bold bg-danger/10 text-danger border border-danger/20 rounded uppercase tracking-wider select-none shrink-0">
							PDF
						</span>
						<h3 class="text-sm font-semibold text-fg truncate" title={activePreviewAttachment.name}>
							{activePreviewAttachment.name}
						</h3>
					</div>

					<!-- Desktop Toolbar placement -->
					<div class="hidden md:block">
						<PdfViewer.Toolbar class="border-0 bg-transparent shadow-none p-0 gap-2" />
					</div>

					<div class="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onclick={() => activePreviewAttachment && handleDownload(activePreviewAttachment)}
							class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface border border-border/60 text-fg transition-colors hover:bg-surface-raised cursor-pointer"
							title="Download PDF"
							aria-label="Download PDF"
						>
							<Download class="size-4.5" />
						</button>
						
						<button
							type="button"
							onclick={closePreview}
							class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface border border-border/60 text-fg transition-colors hover:bg-surface-raised cursor-pointer"
							title="Close Preview"
							aria-label="Close Preview"
						>
							<X class="size-4.5" />
						</button>
					</div>
				</div>

				<!-- Mobile Toolbar placement -->
				<div class="flex md:hidden px-4 py-2 border-b border-border/60 bg-surface-raised/50 justify-center shrink-0">
					<PdfViewer.Toolbar class="border-0 bg-transparent shadow-none p-0 gap-1.5" />
				</div>

				<!-- PDF Pages Renderer -->
				<div class="flex-1 overflow-hidden relative bg-surface-sunken flex justify-center">
					<PdfViewer.Renderer />
				</div>
			</PdfViewer.Root>
		</div>
	</div>
{/if}
