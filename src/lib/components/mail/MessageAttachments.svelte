<script lang="ts">
	import { FileText, LoaderCircle } from 'lucide-svelte';
	import { downloadAttachment } from '$lib/attachments/download';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';
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

<div class="mb-4">
	{#if !settings.compactAttachments}
		<p class="mb-2 text-xs text-fg-subtle">
			{attachments.length === 1 ? '1 attachment' : `${attachments.length} attachments`}
		</p>
	{/if}
	<ul class="flex flex-wrap gap-2">
		{#each attachments as attachment (attachment.blobId)}
			<li>
				<button
					type="button"
					class={cn(
						'inline-flex max-w-full items-center gap-2 rounded-md bg-surface-raised text-xs text-fg transition-colors hover:bg-surface-sunken disabled:opacity-60',
						settings.compactAttachments ? 'px-2 py-1' : 'px-3 py-2',
						!settings.hideReaderPaneBorders && 'border border-border'
					)}
					disabled={downloadingId === attachment.blobId}
					onclick={() => handleDownload(attachment)}
				>
					{#if downloadingId === attachment.blobId}
						<span class="z-spinner size-3.5 shrink-0 text-fg-subtle" aria-hidden="true">
							<LoaderCircle class="size-full" />
						</span>
					{:else}
						<FileText class="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
					{/if}
					<span class="max-w-48 truncate font-medium">{attachment.name}</span>
					{#if !settings.compactAttachments && attachment.size}
						<span class="text-fg-subtle">{formatSize(attachment.size)}</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
</div>
