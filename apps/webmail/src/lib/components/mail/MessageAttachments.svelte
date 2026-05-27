<script lang="ts">
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
import ChevronUp from '$lib/components/icons/ChevronUp.svelte';
import FileText from '$lib/components/icons/FileText.svelte';
import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import { downloadAttachment } from '$lib/attachments/download';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';
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
	{#if canCollapse && !expanded}
		<button
			type="button"
			class={cn(
				'flex w-full items-center justify-between gap-3 rounded-md bg-surface text-left text-sm transition-colors hover:bg-surface-sunken',
				settings.compactAttachments ? 'px-2.5 py-2' : 'px-3 py-2.5',
				!settings.hideReaderPaneBorders && 'border border-border'
			)}
			aria-expanded={false}
			onclick={() => (expanded = true)}
		>
			<span class="inline-flex min-w-0 items-center gap-2">
				<FileText class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
				<span class="font-medium text-fg">{attachmentLabel(attachments.length)}</span>
			</span>
			<span class="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
				Show all
				<ChevronDown class="size-3.5" aria-hidden="true" />
			</span>
		</button>
	{:else}
		<div class="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
			<p class="z-reader-section-label">{attachmentLabel(attachments.length)}</p>
			{#if canCollapse}
				<button
					type="button"
					class="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
					aria-expanded={true}
					onclick={() => (expanded = false)}
				>
					Hide
					<ChevronUp class="size-3.5" aria-hidden="true" />
				</button>
			{/if}
		</div>

		<ul
			class={cn(
				'overflow-hidden rounded-md bg-surface',
				!settings.hideReaderPaneBorders && 'border border-border',
				settings.compactAttachments ? 'divide-y divide-border/80' : 'divide-y divide-border'
			)}
		>
			{#each attachments as attachment (attachment.blobId)}
				<li>
					<button
						type="button"
						class={cn(
							'flex w-full min-w-0 items-center gap-3 text-left text-sm text-fg transition-colors hover:bg-surface-sunken disabled:opacity-60',
							settings.compactAttachments ? 'px-2.5 py-2' : 'px-3 py-2.5'
						)}
						title={attachment.name}
						disabled={downloadingId === attachment.blobId}
						onclick={() => handleDownload(attachment)}
					>
						{#if downloadingId === attachment.blobId}
							<span class="z-spinner size-4 shrink-0 text-fg-subtle" aria-hidden="true">
								<LoaderCircle class="size-full" />
							</span>
						{:else}
							<FileText class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
						{/if}
						<span class="min-w-0 flex-1 truncate font-medium">{attachment.name}</span>
						{#if attachment.size}
							<span class="shrink-0 tabular-nums text-xs text-fg-subtle">
								{formatSize(attachment.size)}
							</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
