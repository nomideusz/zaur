<script lang="ts">
	import { errorMessage } from '@zaur/mail-core/utils/errors';
	import { untrack } from 'svelte';
	import { Dialog } from '@ark-ui/svelte/dialog';
	import { Portal } from '@ark-ui/svelte/portal';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import Download from '$lib/components/icons/Download.svelte';
	import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import X from '$lib/components/icons/X.svelte';
	import { downloadAttachment, getAttachmentBlob } from '$lib/attachments/download';
	import { attachmentPreviewKind } from '$lib/attachments/preview';
	import { PdfViewer } from '$lib/components/ui/pdf-viewer';
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { MessageAttachment } from '$lib/types/mail';

	interface Props {
		/** Previewable attachments of the message, in display order. */
		attachments: MessageAttachment[];
		index: number;
		open: boolean;
		onClose: () => void;
		onIndexChange: (index: number) => void;
	}

	let { attachments, index, open, onClose, onIndexChange }: Props = $props();

	const active = $derived(open ? (attachments[index] ?? null) : null);
	const kind = $derived(active ? attachmentPreviewKind(active) : null);
	const hasMultiple = $derived(attachments.length > 1);
	/* Track the stable id, not the object — attachment arrays are rebuilt on
	   every list refresh, and recreating the object URL mid-display would point
	   live <img>/<video> elements at revoked blob: URLs. */
	const activeBlobId = $derived(active?.blobId ?? null);

	let blob = $state<Blob | null>(null);
	let objectUrl = $state<string | null>(null);
	let textContent = $state<string | null>(null);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let mediaError = $state(false);
	let generation = 0;

	/* The effect body only WRITES display state (reading it here would make it
	   a dependency and re-trigger the effect when the async load lands). The
	   object URL is revoked exclusively in the cleanup, which runs on blobId
	   change and on destroy — after the elements using it are gone. */
	$effect(() => {
		void activeBlobId;
		const attachment = activeBlobId ? untrack(() => active) : null;

		blob = null;
		textContent = null;
		loadError = null;
		mediaError = false;
		objectUrl = null;

		if (!attachment) return;

		const requestId = ++generation;
		loading = true;
		let createdUrl: string | null = null;
		void (async () => {
			try {
				const data = await getAttachmentBlob(attachment);
				if (requestId !== generation) return;
				blob = data;
				if (attachmentPreviewKind(attachment) === 'text') {
					textContent = await data.text();
					if (requestId !== generation) return;
				} else {
					createdUrl = URL.createObjectURL(data);
					objectUrl = createdUrl;
				}
			} catch (err) {
				if (requestId !== generation) return;
				loadError = errorMessage(err, 'Failed to load preview');
			} finally {
				if (requestId === generation) loading = false;
			}
		})();

		return () => {
			generation++;
			if (createdUrl) URL.revokeObjectURL(createdUrl);
		};
	});

	function navigate(direction: 1 | -1) {
		if (!hasMultiple) return;
		const next = (index + direction + attachments.length) % attachments.length;
		onIndexChange(next);
	}

	function onKeydown(event: KeyboardEvent) {
		if (!open) return;
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			navigate(1);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			navigate(-1);
		}
	}

	async function download() {
		if (!active) return;
		try {
			await downloadAttachment(active);
		} catch (err) {
			toast.show(errorMessage(err, 'Download failed'), 'error');
		}
	}

	const headerBtn =
		'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-surface text-fg transition-colors hover:bg-surface-raised';

	const KIND_LABELS: Record<string, string> = {
		image: 'Image',
		video: 'Video',
		audio: 'Audio',
		pdf: 'PDF',
		text: 'Text'
	};
</script>

<svelte:window onkeydown={onKeydown} />

<Dialog.Root
	{open}
	onOpenChange={(details) => {
		if (!details.open) onClose();
	}}
>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-50 bg-black/60 backdrop-blur-md" />
		<Dialog.Positioner
			class="fixed inset-0 z-50 flex items-center justify-center px-4 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] md:py-8"
		>
			{#if active}
				<Dialog.Content
					class="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
				>
					<header
						class="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-surface-raised px-4 py-3 md:px-6"
					>
						<div class="flex min-w-0 items-center gap-3">
							<span
								class="shrink-0 rounded border border-border bg-surface px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-fg-muted select-none"
							>
								{KIND_LABELS[kind ?? ''] ?? 'File'}
							</span>
							<TooltipWrap label={active.name}>
								{#snippet trigger({ props })}
									<Dialog.Title {...props} class="truncate text-sm font-semibold text-fg">
										{active.name}
									</Dialog.Title>
								{/snippet}
							</TooltipWrap>
							{#if hasMultiple}
								<span class="shrink-0 text-xs tabular-nums text-fg-subtle">
									{index + 1} / {attachments.length}
								</span>
							{/if}
						</div>

						<div class="flex shrink-0 items-center gap-2">
							<TooltipWrap label="Download">
								{#snippet trigger({ props })}
									<button {...props} type="button" class={headerBtn} aria-label="Download" onclick={download}>
										<Download class="size-4.5" />
									</button>
								{/snippet}
							</TooltipWrap>
							<TooltipWrap label="Close preview">
								{#snippet trigger({ props })}
									<button {...props} type="button" class={headerBtn} aria-label="Close preview" onclick={onClose}>
										<X class="size-4.5" />
									</button>
								{/snippet}
							</TooltipWrap>
						</div>
					</header>

					<div class="relative flex min-h-0 flex-1">
						{#key active.blobId}
						{#if loading}
							<div class="flex flex-1 items-center justify-center">
								<span class="z-spinner size-6 text-fg-muted" aria-hidden="true">
									<LoaderCircle class="size-full" />
								</span>
							</div>
						{:else if loadError}
							<div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
								<p class="text-sm text-danger">{loadError}</p>
							</div>
						{:else if kind === 'image' && objectUrl}
							<div class="flex flex-1 items-center justify-center overflow-auto bg-surface-sunken p-4">
								<img
									src={objectUrl}
									alt={active.name}
									class="max-h-full max-w-full rounded object-contain shadow-md"
								/>
							</div>
						{:else if kind === 'video' && objectUrl}
							<div class="flex flex-1 items-center justify-center bg-black/90 p-2">
								{#if mediaError}
									<div class="flex flex-col items-center gap-3 p-8 text-center">
										<p class="text-sm text-white/80">This video format can't be played in the browser.</p>
										<button type="button" class="z-mail-text-nav__action z-mail-text-nav__action--pill" onclick={download}>
											Download instead
										</button>
									</div>
								{:else}
									<!-- svelte-ignore a11y_media_has_caption -->
									<video
										src={objectUrl}
										controls
										autoplay
										class="max-h-full max-w-full"
										onerror={() => (mediaError = true)}
									></video>
								{/if}
							</div>
						{:else if kind === 'audio' && objectUrl}
							<div class="flex flex-1 items-center justify-center p-8">
								{#if mediaError}
									<div class="flex flex-col items-center gap-3 text-center">
										<p class="text-sm text-fg-muted">This audio format can't be played in the browser.</p>
										<button type="button" class="z-mail-text-nav__action z-mail-text-nav__action--pill" onclick={download}>
											Download instead
										</button>
									</div>
								{:else}
									<audio src={objectUrl} controls class="w-full max-w-md" onerror={() => (mediaError = true)}></audio>
								{/if}
							</div>
						{:else if kind === 'text' && textContent !== null}
							<div class="flex-1 overflow-auto bg-surface-sunken">
								<pre class="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-fg">{textContent}</pre>
							</div>
						{:else if kind === 'pdf' && blob}
							<PdfViewer.Root src={blob} class="flex-1 bg-surface-sunken">
								<div class="flex shrink-0 justify-center border-b border-border/60 bg-surface-raised/50 px-4 py-2">
									<PdfViewer.Toolbar />
								</div>
								<PdfViewer.Renderer />
							</PdfViewer.Root>
						{:else}
							<div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
								<p class="text-sm text-fg-muted">No preview available for this file.</p>
								<button type="button" class="z-mail-text-nav__action z-mail-text-nav__action--pill" onclick={download}>
									Download
								</button>
							</div>
						{/if}
						{/key}

						{#if hasMultiple}
							<button
								type="button"
								class="absolute left-2 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border/60 bg-surface/90 text-fg shadow-md transition-colors hover:bg-surface"
								aria-label="Previous attachment"
								onclick={() => navigate(-1)}
							>
								<ChevronLeft class="size-5" aria-hidden="true" />
							</button>
							<button
								type="button"
								class="absolute right-2 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border/60 bg-surface/90 text-fg shadow-md transition-colors hover:bg-surface"
								aria-label="Next attachment"
								onclick={() => navigate(1)}
							>
								<ChevronRight class="size-5" aria-hidden="true" />
							</button>
						{/if}
					</div>
				</Dialog.Content>
			{/if}
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
