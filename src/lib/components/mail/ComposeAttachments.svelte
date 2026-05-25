<script lang="ts">
	import { LoaderCircle, Paperclip, X } from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { formatAttachmentSize } from '$lib/attachments/upload';
	import { compose } from '$lib/stores/compose.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
</script>

{#if compose.attachments.length}
	<div
		class={cn(
			'flex shrink-0 flex-wrap',
			settings.compactComposeAttachments ? 'gap-1 px-3 py-1.5' : 'gap-2 px-5 py-3',
			!settings.hideComposePanelBorders && 'border-t border-border'
		)}
	>
		{#each compose.attachments as attachment (attachment.id)}
			<div
				class={cn(
					'flex max-w-full items-center rounded-md bg-surface text-fg',
					settings.compactComposeAttachments
						? 'gap-1.5 px-2 py-1 text-[11px]'
						: 'gap-2 px-2.5 py-1.5 text-xs',
					!settings.hideComposePanelBorders && 'border border-border'
				)}
			>
				<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
				<span class="truncate">{attachment.name}</span>
				{#if !settings.compactAttachments}
					<span class="shrink-0 text-fg-subtle">({formatAttachmentSize(attachment.size)})</span>
				{/if}
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
