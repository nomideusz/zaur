<script lang="ts">
	import FileText from '$lib/components/icons/FileText.svelte';
	import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import { downloadAttachment } from '$lib/attachments/download';
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

	const canCollapse = $derived(attachments.length > COLLAPSE_THRESHOLD);

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
			const message = err instanceof Error ? err.message : 'Download failed';
			toast.show(message, 'error');
		} finally {
			downloadingId = null;
		}
	}
</script>

<section class="z-reader-attachments" aria-label={attachmentLabel(attachments.length)}>
	<div class="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
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
				<li>
					<button
						type="button"
						class="z-reader-attachment-item"
						title={attachment.name}
						disabled={downloadingId === attachment.blobId}
						onclick={() => handleDownload(attachment)}
					>
						{#if downloadingId === attachment.blobId}
							<span class="z-spinner size-4 shrink-0 text-fg-muted" aria-hidden="true">
								<LoaderCircle class="size-full" />
							</span>
						{:else}
							<FileText class="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
						{/if}
						<span class="z-reader-attachment-name">{attachment.name}</span>
						{#if attachment.size}
							<span class="z-reader-attachment-size">{formatSize(attachment.size)}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
