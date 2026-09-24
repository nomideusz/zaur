<script lang="ts">
	import { onMount } from 'svelte';
	import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
	import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

	/**
	 * A PDF as a column of pages, drawn by pdf.js rather than the browser's own
	 * viewer: Android Chrome has none, and iOS shows one page. Only the pages
	 * near the viewport hold a canvas — a page at 2× is ~20 MB of pixels, so a
	 * long PDF drawn whole would take the tab down. No text layer: reading, not
	 * selecting, is what a preview is for; Download has the real file.
	 */
	let { data, zoom = 1, onError }: { data: ArrayBuffer; zoom?: number; onError: () => void } = $props();

	const MAX_DPR = 2;
	/** Past this a page is a wall of text on a wide screen; zoom goes further. */
	const MAX_FIT_WIDTH = 960;

	let doc: PDFDocumentProxy | null = null;
	let sizes = $state<{ w: number; h: number }[]>([]);
	let boxWidth = $state(0);

	const scale = $derived.by(() => {
		if (!sizes.length || !boxWidth) return 0;
		const widest = Math.max(...sizes.map((size) => size.w));
		return (Math.min(boxWidth - 32, MAX_FIT_WIDTH) / widest) * zoom;
	});

	const visible = new Set<HTMLElement>();
	const tasks = new Map<HTMLElement, RenderTask>();

	async function draw(node: HTMLElement) {
		const target = scale;
		if (!doc || !target || node.dataset.scale === String(target)) return;
		node.dataset.scale = String(target);
		tasks.get(node)?.cancel();

		const page = await doc.getPage(Number(node.dataset.page));
		const viewport = page.getViewport({ scale: target });
		const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
		const canvas = document.createElement('canvas');
		canvas.width = Math.floor(viewport.width * dpr);
		canvas.height = Math.floor(viewport.height * dpr);
		canvas.className = 'absolute inset-0 size-full';
		const context = canvas.getContext('2d');
		if (!context || node.dataset.scale !== String(target)) return;
		context.scale(dpr, dpr);

		const task = page.render({ canvas, canvasContext: context, viewport });
		tasks.set(node, task);
		try {
			await task.promise;
			if (node.dataset.scale === String(target)) node.replaceChildren(canvas);
		} catch {
			// Cancelled by a newer draw or by scrolling away; that one owns the page now.
		} finally {
			if (tasks.get(node) === task) tasks.delete(node);
		}
	}

	function forget(node: HTMLElement) {
		tasks.get(node)?.cancel();
		tasks.delete(node);
		delete node.dataset.scale;
		node.replaceChildren();
	}

	function onEntries(entries: IntersectionObserverEntry[]) {
		for (const entry of entries) {
			const node = entry.target as HTMLElement;
			if (entry.isIntersecting) {
				visible.add(node);
				void draw(node);
			} else {
				visible.delete(node);
				forget(node);
			}
		}
	}

	let scroller: HTMLElement;
	let observer: IntersectionObserver | null = null;

	function page(node: HTMLElement) {
		// Rooted on the scroller: against the viewport, its clipping would hide
		// the margin and a page would only start drawing once already on screen.
		observer ??= new IntersectionObserver(onEntries, { root: scroller, rootMargin: '100% 0px' });
		observer.observe(node);
		return () => {
			observer?.unobserve(node);
			visible.delete(node);
			forget(node);
		};
	}

	// Zooming or resizing redraws what is on screen; the rest redraws as it scrolls in.
	$effect(() => {
		void scale;
		for (const node of visible) void draw(node);
	});

	onMount(() => {
		let cancelled = false;
		(async () => {
			try {
				const pdfjs = await import('pdfjs-dist');
				pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
				// A copy: the worker takes ownership of the buffer it is given.
				const loaded = await pdfjs.getDocument({ data: data.slice(0) }).promise;
				if (cancelled) return void loaded.loadingTask.destroy();
				const next: { w: number; h: number }[] = [];
				for (let n = 1; n <= loaded.numPages; n++) {
					const { width, height } = (await loaded.getPage(n)).getViewport({ scale: 1 });
					next.push({ w: width, h: height });
				}
				if (cancelled) return void loaded.loadingTask.destroy();
				doc = loaded;
				sizes = next;
			} catch {
				if (!cancelled) onError();
			}
		})();
		return () => {
			cancelled = true;
			observer?.disconnect();
			for (const task of tasks.values()) task.cancel();
			void doc?.loadingTask.destroy();
		};
	});
</script>

<div class="absolute inset-0 overflow-auto overscroll-contain" bind:this={scroller} bind:clientWidth={boxWidth}>
	{#if scale}
		<div class="flex min-w-fit flex-col items-center gap-4 px-4 py-5">
			{#each sizes as size, index (index)}
				<div
					class="relative shrink-0 bg-white shadow-[0_1px_3px_rgb(0_0_0/0.16),0_0_0_1px_rgb(0_0_0/0.05)]"
					style:width="{size.w * scale}px"
					style:height="{size.h * scale}px"
					data-page={index + 1}
					role="img"
					aria-label="Page {index + 1} of {sizes.length}"
					{@attach page}
				></div>
			{/each}
		</div>
	{:else}
		<div class="flex h-full items-center justify-center text-[12.5px] text-[var(--z-muted)]">Opening the PDF…</div>
	{/if}
</div>
