<script lang="ts">
	import { untrack } from 'svelte';
	import type { MessageAttachment } from '@zaur/mail-core';
	import { attachmentKind } from '#lib/compose/attachments';
	import { attachmentBadge } from '#lib/mail/colors';
	import { attachmentUrl, formatBytes, previewKind } from '#lib/mail/rows';
	import ActionIcon from './ActionIcon.svelte';
	import PdfPages from './PdfPages.svelte';

	/**
	 * A message's attachments, opened in place: images, PDFs, video, audio and
	 * text. A native modal <dialog> — the top layer clears the reader's
	 * overflow on a phone, Escape closes it, and the page behind goes inert.
	 * Arrows (and ← →) step through every attachment that can be previewed.
	 */
	let {
		items,
		index = $bindable(),
		onClose
	}: { items: MessageAttachment[]; index: number; onClose: () => void } = $props();

	const current = $derived(items[index]);
	const kind = $derived(current ? previewKind(current) : null);
	const url = $derived(current ? attachmentUrl(current.blobId, current.name, current.type) : '');
	const badge = $derived(attachmentBadge(current?.type ?? ''));

	/** Keyed by blob, not the object: a list refresh hands in new objects for the same file. */
	const key = $derived(current?.blobId ?? '');

	let loaded = $state<{ key: string; text?: string; bytes?: ArrayBuffer; src?: string } | null>(null);
	let failed = $state<string | null>(null);
	let zoom = $state(1);

	$effect(() => {
		const blob = key;
		const what = kind;
		const from = untrack(() => url);
		loaded = null;
		failed = null;
		zoom = 1;
		// An image loads straight into <img>; the rest are fetched whole. Video and
		// audio play from a blob because Safari will not play a proxied stream that
		// cannot answer range requests.
		if (!blob || !what || what === 'image') return;
		let cancelled = false;
		let objectUrl: string | null = null;
		fetch(from)
			.then(async (response) => {
				if (!response.ok) throw new Error(String(response.status));
				if (what === 'text') return { key: blob, text: await response.text() };
				if (what === 'pdf') return { key: blob, bytes: await response.arrayBuffer() };
				objectUrl = URL.createObjectURL(await response.blob());
				return { key: blob, src: objectUrl };
			})
			.then((result) => {
				if (cancelled) return;
				loaded = result;
			})
			.catch(() => {
				if (!cancelled) failed = blob;
			});
		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	});

	const ready = $derived(loaded?.key === key ? loaded : null);

	function step(by: number) {
		if (items.length < 2) return;
		index = (index + by + items.length) % items.length;
	}

	function dialog(node: HTMLDialogElement) {
		node.showModal();
		// The dialog, not its first button: Previous with a focus ring reads as chosen.
		node.focus();
		const keys = (event: KeyboardEvent) => {
			// The page's shortcuts (j/k, e, #…) must not act behind the preview.
			event.stopPropagation();
			if (event.target instanceof HTMLMediaElement) return;
			if (event.key === 'ArrowLeft') step(-1);
			else if (event.key === 'ArrowRight') step(1);
		};
		node.addEventListener('keydown', keys);
		return () => {
			node.removeEventListener('keydown', keys);
			node.close();
		};
	}

	const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
	const zoomAt = $derived(ZOOMS.indexOf(zoom));
</script>

<dialog
	{@attach dialog}
	tabindex="-1"
	class="m-auto h-[calc(100dvh-48px)] outline-none max-h-none w-[min(1100px,calc(100vw-48px))] max-w-none overflow-hidden rounded-[14px] border border-[var(--z-line)] bg-[var(--z-surface)] p-0 text-[var(--z-ink)] shadow-[0_24px_64px_rgb(0_0_0/0.28)] backdrop:bg-[rgb(12_14_18/0.55)] max-md:h-dvh max-md:w-screen max-md:rounded-none max-md:border-0"
	aria-label="Preview of {current?.name ?? 'attachment'}"
	onclose={onClose}
	onclick={(event) => event.target === event.currentTarget && onClose()}
>
	{#if current}
		<div class="flex h-full flex-col">
			<header class="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-[var(--z-hairline)] pr-2.5 pl-4 max-md:h-[60px] max-md:gap-1.5 max-md:pl-3">
				<span
					class="flex size-[26px] shrink-0 items-center justify-center rounded-[6px] border text-[9px] font-bold uppercase"
					style:background-color={badge.bg}
					style:border-color={badge.border}
					style:color={badge.text}
					aria-hidden="true"
				>
					{attachmentKind(current.name, current.type)}
				</span>
				<div class="min-w-0 flex-1">
					<div class="truncate text-[13.5px] font-semibold">{current.name}</div>
					<div class="z-mono text-[10.5px] text-[var(--z-soft)]">
						{formatBytes(current.size)}{items.length > 1 ? ` · ${index + 1} of ${items.length}` : ''}
					</div>
				</div>

				{#if kind === 'pdf' && ready}
					<div class="z-group shrink-0 max-md:hidden" role="group" aria-label="Zoom">
						<button type="button" class="z-icon-btn" aria-label="Zoom out" disabled={zoomAt <= 0} onclick={() => (zoom = ZOOMS[zoomAt - 1] ?? zoom)}>
							<svg class="size-[15px]" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
						</button>
						<button type="button" class="z-mono min-w-[46px] text-[11px] font-semibold text-[var(--z-muted)] hover:text-[var(--z-ink)]" title="Fit to width" onclick={() => (zoom = 1)}>
							{Math.round(zoom * 100)}%
						</button>
						<button type="button" class="z-icon-btn" aria-label="Zoom in" disabled={zoomAt >= ZOOMS.length - 1} onclick={() => (zoom = ZOOMS[zoomAt + 1] ?? zoom)}>
							<svg class="size-[15px]" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8h9M8 3.5v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
						</button>
					</div>
				{/if}

				{#if items.length > 1}
					<div class="z-group shrink-0" role="group" aria-label="Attachments">
						<button type="button" class="z-icon-btn max-md:!size-10" aria-label="Previous attachment" title="Previous (←)" onclick={() => step(-1)}>
							<ActionIcon name="chevron" class="size-3.5 rotate-90" />
						</button>
						<button type="button" class="z-icon-btn max-md:!size-10" aria-label="Next attachment" title="Next (→)" onclick={() => step(1)}>
							<ActionIcon name="chevron" class="size-3.5 -rotate-90" />
						</button>
					</div>
				{/if}

				<a class="btn-tactile !h-8 shrink-0 !px-3 !text-[12.5px] max-md:!size-10 max-md:!px-0" href={url} download={current.name} title="Download {current.name}">
					<svg class="size-[14px] shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M8 2.5v8M4.5 7.5 8 11l3.5-3.5M3 13.5h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					<span class="max-md:sr-only">Download</span>
				</a>
				<button type="button" class="z-icon-btn shrink-0 max-md:!size-10" aria-label="Close preview" title="Close (Esc)" onclick={onClose}>
					<svg class="size-[15px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
					</svg>
				</button>
			</header>

			<div class="relative min-h-0 flex-1 bg-[var(--z-sunken)]">
				{#if failed === key}
					<div class="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
						<p class="text-[13px] text-[var(--z-muted)]">This file could not be shown here.</p>
						<a class="btn-tactile !h-8 !px-3 !text-[12.5px]" href={url} download={current.name}>Download it</a>
					</div>
				{:else if kind === 'image'}
					{#key key}
						<img
							src={url}
							alt={current.name}
							class="absolute inset-0 m-auto max-h-[calc(100%-40px)] max-w-[calc(100%-40px)] object-contain shadow-[0_1px_3px_rgb(0_0_0/0.16)] max-md:max-h-full max-md:max-w-full"
							onerror={() => (failed = key)}
						/>
					{/key}
				{:else if !ready}
					<div class="flex h-full items-center justify-center text-[12.5px] text-[var(--z-muted)]">Loading…</div>
				{:else if kind === 'pdf' && ready.bytes}
					{#key key}
						<PdfPages data={ready.bytes} {zoom} onError={() => (failed = key)} />
					{/key}
				{:else if kind === 'video' && ready.src}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={ready.src} controls playsinline class="absolute inset-0 m-auto max-h-full max-w-full"></video>
				{:else if kind === 'audio' && ready.src}
					<div class="flex h-full items-center justify-center p-6">
						<audio src={ready.src} controls class="w-full max-w-[480px]"></audio>
					</div>
				{:else if kind === 'text' && ready.text !== undefined}
					<pre class="z-mono absolute inset-0 overflow-auto p-5 text-[12.5px] leading-[1.6] whitespace-pre-wrap text-[var(--z-body)] select-text">{ready.text}</pre>
				{/if}
			</div>
		</div>
	{/if}
</dialog>
