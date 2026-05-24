<script lang="ts">
	import { LoaderCircle, Paperclip, X } from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { formatAttachmentSize } from '$lib/attachments/upload';
	import { compose } from '$lib/stores/compose.svelte';
</script>

{#if compose.attachments.length}
	<div class="flex shrink-0 flex-wrap gap-2 border-t border-border px-5 py-3">
		{#each compose.attachments as attachment (attachment.id)}
			<div
				class="flex max-w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-fg"
			>
				<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
				<span class="truncate">{attachment.name}</span>
				<span class="shrink-0 text-fg-subtle">({formatAttachmentSize(attachment.size)})</span>
				{#if attachment.uploading}
					<LoaderCircle class="size-3.5 shrink-0 animate-spin text-fg-subtle" aria-label="Uploading" />
				{:else if attachment.uploadError}
					<span class="shrink-0 text-danger">Failed</span>
				{/if}
				<IconButton
					label="Remove {attachment.name}"
					class="!p-0.5"
					onclick={() => compose.removeAttachment(attachment.id)}
				>
					<X class="size-3.5" />
				</IconButton>
			</div>
		{/each}
	</div>
{/if}
