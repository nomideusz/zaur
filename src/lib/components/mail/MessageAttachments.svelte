<script lang="ts">
	import { FileText, LoaderCircle } from 'lucide-svelte';
	import { downloadAttachment } from '$lib/attachments/download';
	import { toast } from '$lib/stores/toast.svelte';
	import type { MessageAttachment } from '$lib/types/mail';

	interface Props {
		attachments: MessageAttachment[];
	}

	let { attachments }: Props = $props();

	let downloadingId = $state<string | null>(null);

	function formatSize(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

<div class="mb-4 rounded-lg border border-border bg-surface/60 p-3">
	<p class="mb-2 text-xs font-medium text-fg-muted">
		{attachments.length === 1 ? '1 attachment' : `${attachments.length} attachments`}
	</p>
	<ul class="flex flex-wrap gap-2">
		{#each attachments as attachment (attachment.blobId)}
			<li>
				<button
					type="button"
					class="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-fg transition-colors hover:bg-surface-sunken disabled:opacity-60"
					disabled={downloadingId === attachment.blobId}
					onclick={() => handleDownload(attachment)}
				>
					{#if downloadingId === attachment.blobId}
						<LoaderCircle class="size-3.5 shrink-0 animate-spin text-fg-subtle" aria-hidden="true" />
					{:else}
						<FileText class="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
					{/if}
					<span class="max-w-48 truncate font-medium">{attachment.name}</span>
					{#if attachment.size}
						<span class="text-fg-subtle">{formatSize(attachment.size)}</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
</div>
