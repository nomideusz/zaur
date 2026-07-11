<script lang="ts">
	import { errorMessage } from '@zaur/mail-core/utils/errors';
	import Download from '$lib/components/icons/Download.svelte';
	import FileText from '$lib/components/icons/FileText.svelte';
	import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import {
		attachmentDisplayName,
		attachmentIsOpaqueName
	} from '$lib/attachments/display-name';
	import { downloadAttachment } from '$lib/attachments/download';
	import { attachmentPreviewKind } from '$lib/attachments/preview';
	import AttachmentPreview from '$lib/components/mail/AttachmentPreview.svelte';
	import AttachmentThumbnail from '$lib/components/mail/AttachmentThumbnail.svelte';
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { MessageAttachment } from '$lib/types/mail';

	interface Props {
		attachments: MessageAttachment[];
	}

	let { attachments }: Props = $props();

	/** Above this count, the list stays folded until the user expands it. */
	const COLLAPSE_THRESHOLD = 4;

	let downloadingId = $state<string | null>(null);
	let expanded = $state(false);
	let previewOpen = $state(false);
	let previewIndex = $state(0);

	const canCollapse = $derived(attachments.length > COLLAPSE_THRESHOLD);
	const previewable = $derived(attachments.filter((item) => attachmentPreviewKind(item) !== null));

	function formatSize(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function attachmentLabel(count: number) {
		return count === 1 ? '1 attachment' : `${count} attachments`;
	}

	async function handleDownload(attachment: MessageAttachment) {
		downloadingId = attachment.blobId;
		try {
			await downloadAttachment(attachment);
		} catch (err) {
			toast.show(errorMessage(err, 'Download failed'), 'error');
		} finally {
			downloadingId = null;
		}
	}

	async function handleAttachmentClick(attachment: MessageAttachment) {
		const index = previewable.findIndex((item) => item.blobId === attachment.blobId);
		if (index >= 0) {
			previewIndex = index;
			previewOpen = true;
			return;
		}

		await handleDownload(attachment);
	}
</script>

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
				{@const previewKind = attachmentPreviewKind(attachment)}
				{@const attachmentHint = previewKind
					? `Preview ${attachment.name}`
					: opaqueName
						? `${attachment.name} — download`
						: `Download ${attachment.name}`}
				<li class="relative">
					<TooltipWrap label={attachmentHint} wrapDisabled={downloadingId === attachment.blobId}>
						{#snippet trigger({ props })}
							<button
								{...props}
								type="button"
								class="z-reader-attachment-item {previewKind ? 'pr-10' : ''}"
								aria-label={previewKind ? `Preview ${displayName}` : `Download ${displayName}`}
								disabled={downloadingId === attachment.blobId}
								onclick={() => handleAttachmentClick(attachment)}
							>
								{#if downloadingId === attachment.blobId}
									<span class="z-spinner size-4 shrink-0 text-fg-muted" aria-hidden="true">
										<LoaderCircle class="size-full" />
									</span>
								{:else if attachment.type.startsWith('image/')}
									<AttachmentThumbnail
										{attachment}
										class="size-9 shrink-0 rounded border border-border/60 object-cover"
									>
										{#snippet fallback()}
											<FileText class="z-reader-attachment-icon" aria-hidden="true" />
										{/snippet}
									</AttachmentThumbnail>
								{:else}
									<FileText class="z-reader-attachment-icon" aria-hidden="true" />
								{/if}
								<span class="z-reader-attachment-copy">
									<span class="z-reader-attachment-name">{displayName}</span>
									<span class="z-reader-attachment-meta">
										{#if attachment.size}
											<span class="z-reader-attachment-size">{formatSize(attachment.size)}</span>
										{/if}
										<span class="z-reader-attachment-action">{previewKind ? 'Preview' : 'Download'}</span>
									</span>
								</span>
							</button>
						{/snippet}
					</TooltipWrap>
					{#if previewKind}
						<TooltipWrap label={`Download ${displayName}`}>
							{#snippet trigger({ props })}
								<button
									{...props}
									type="button"
									class="z-icon-tap-target z-icon-tap-target--sm absolute right-0 top-1/2 -translate-y-1/2"
									aria-label={`Download ${displayName}`}
									disabled={downloadingId === attachment.blobId}
									onclick={() => handleDownload(attachment)}
								>
									{#if downloadingId === attachment.blobId}
										<span class="z-spinner size-4 text-fg-muted" aria-hidden="true">
											<LoaderCircle class="size-full" />
										</span>
									{:else}
										<Download class="size-4" aria-hidden="true" />
									{/if}
								</button>
							{/snippet}
						</TooltipWrap>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<AttachmentPreview
	attachments={previewable}
	index={previewIndex}
	open={previewOpen}
	onClose={() => (previewOpen = false)}
	onIndexChange={(index) => (previewIndex = index)}
/>
