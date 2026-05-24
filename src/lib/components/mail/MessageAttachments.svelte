<script lang="ts">
	import { Paperclip } from 'lucide-svelte';
	import type { MessageAttachment } from '$lib/types/mail';

	interface Props {
		attachments: MessageAttachment[];
	}

	let { attachments }: Props = $props();

	function downloadUrl(attachment: MessageAttachment) {
		const params = new URLSearchParams({
			blobId: attachment.blobId,
			name: attachment.name,
			type: attachment.type
		});
		return `/api/jmap/download?${params}`;
	}

	function formatSize(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<ul class="mb-4 flex flex-wrap gap-2">
	{#each attachments as attachment (attachment.blobId)}
		<li>
			<a
				href={downloadUrl(attachment)}
				download={attachment.name}
				class="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-fg transition-colors hover:bg-surface-sunken"
			>
				<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
				<span class="max-w-48 truncate">{attachment.name}</span>
				{#if attachment.size}
					<span class="text-fg-subtle">({formatSize(attachment.size)})</span>
				{/if}
			</a>
		</li>
	{/each}
</ul>
