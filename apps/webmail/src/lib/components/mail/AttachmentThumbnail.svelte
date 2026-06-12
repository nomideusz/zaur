<script lang="ts">
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

	let url = $state<string | null>(null);

	$effect(() => {
		const target = attachment;
		url = null;
		if (!target.type.startsWith('image/') || (target.size ?? 0) > MAX_THUMB_SOURCE_BYTES) {
			return;
		}

		let revoked = false;
		let created: string | null = null;
		void getAttachmentBlob(target)
			.then((blob) => {
				if (revoked) return;
				created = URL.createObjectURL(blob);
				url = created;
			})
			.catch(() => {
				// Offline and uncached — the generic icon stays.
			});

		return () => {
			revoked = true;
			if (created) URL.revokeObjectURL(created);
		};
	});
</script>

{#if url}
	<img src={url} alt="" aria-hidden="true" class={className} loading="lazy" />
{:else}
	{@render fallback()}
{/if}
