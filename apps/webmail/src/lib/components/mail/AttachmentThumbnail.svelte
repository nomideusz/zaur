<script lang="ts">
	import { untrack } from 'svelte';
	import { getAttachmentBlob } from '$lib/attachments/download';
	import type { MessageAttachment } from '$lib/types/mail';
	import type { Snippet } from 'svelte';

	interface Props {
		attachment: MessageAttachment;
		/** Rendered while the thumbnail loads or when it can't be produced. */
		fallback: Snippet;
		class?: string;
	}

	let { attachment, fallback, class: className = '' }: Props = $props();

	/** Same ceiling as the blob cache — bigger images aren't worth thumbnailing. */
	const MAX_THUMB_SOURCE_BYTES = 5 * 1024 * 1024;

	/* Track primitives, not the object: list refreshes hand us new attachment
	   objects with the same blobId, and revoking/recreating the object URL on
	   each would leave <img> elements pointing at dead blob: URLs. */
	const blobId = $derived(attachment.blobId);
	const type = $derived(attachment.type);
	const size = $derived(attachment.size ?? 0);

	let url = $state<string | null>(null);

	$effect(() => {
		void blobId;
		url = null;
		if (!type.startsWith('image/') || size > MAX_THUMB_SOURCE_BYTES) return;

		const target = untrack(() => attachment);
		let cancelled = false;
		let created: string | null = null;
		void getAttachmentBlob(target)
			.then((blob) => {
				if (cancelled) return;
				created = URL.createObjectURL(blob);
				url = created;
			})
			.catch(() => {
				// Offline and uncached — the generic icon stays.
			});

		return () => {
			cancelled = true;
			if (created) URL.revokeObjectURL(created);
		};
	});
</script>

{#if url}
	<img src={url} alt="" aria-hidden="true" class={className} loading="lazy" />
{:else}
	{@render fallback()}
{/if}
