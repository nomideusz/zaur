<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { cn } from '$lib/utils/cn';
  import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';
  import { PDF_VIEWER_CTX, type PdfViewerContext } from './Root.svelte';

  export interface PdfRendererProps {
    class?: string;
  }

  let { class: className = '' }: PdfRendererProps = $props();

  const context = getContext<PdfViewerContext>(PDF_VIEWER_CTX);

  /** Cap the backing-store resolution — retina × high zoom canvases get huge. */
  const MAX_DPR = 2;
  const PADDING = 16;

  let scroller = $state<HTMLDivElement | null>(null);
  let pageEls: (HTMLDivElement | null)[] = $state([]);
  let baseSizes = $state<{ width: number; height: number }[]>([]);
  let fitScale = $state(1);

  const pdf = $derived(context?.pdf ?? null);
  const scale = $derived(fitScale * (context?.zoom ?? 1));

  const pages = new Map<number, PDFPageProxy>();
  type RenderedPage = {
    scale: number;
    canvas: HTMLCanvasElement;
    textLayerEl: HTMLDivElement;
    renderTask: RenderTask | null;
    textLayer: { cancel(): void } | null;
  };
  const rendered = new Map<number, RenderedPage>();
  const intersecting = new Set<number>();
  let observer: IntersectionObserver | null = null;
  let destroyed = false;

  function computeFitScale() {
    if (!scroller || !baseSizes.length) return;
    const maxWidth = Math.max(...baseSizes.map((size) => size.width));
    if (maxWidth <= 0) return;
    const available = scroller.clientWidth - PADDING * 2;
    fitScale = Math.min(3, Math.max(0.25, available / maxWidth));
  }

  async function measure() {
    if (!pdf) return;
    const sizes: { width: number; height: number }[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      if (destroyed) return;
      pages.set(pageNum, page);
      const viewport = page.getViewport({ scale: 1 });
      sizes.push({ width: viewport.width, height: viewport.height });
    }
    baseSizes = sizes;
    computeFitScale();
  }

  function destroyPage(pageNum: number) {
    const entry = rendered.get(pageNum);
    if (!entry) return;
    entry.renderTask?.cancel();
    entry.textLayer?.cancel();
    entry.canvas.remove();
    entry.textLayerEl.remove();
    rendered.delete(pageNum);
  }

  async function renderPage(pageNum: number, targetScale: number) {
    const host = pageEls[pageNum - 1];
    const page = pages.get(pageNum);
    if (!host || !page || destroyed) return;

    const existing = rendered.get(pageNum);
    if (existing?.scale === targetScale) return;
    destroyPage(pageNum);

    const viewport = page.getViewport({ scale: targetScale });
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.className = 'absolute inset-0 h-full w-full';
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    ctx2d.scale(dpr, dpr);

    const textLayerEl = document.createElement('div');
    textLayerEl.className = 'textLayer';

    host.appendChild(canvas);
    host.appendChild(textLayerEl);

    const entry: RenderedPage = {
      scale: targetScale,
      canvas,
      textLayerEl,
      renderTask: null,
      textLayer: null
    };
    rendered.set(pageNum, entry);

    try {
      entry.renderTask = page.render({ canvas, canvasContext: ctx2d, viewport });
      const { TextLayer } = await import('pdfjs-dist');
      const textLayer = new TextLayer({
        textContentSource: page.streamTextContent(),
        container: textLayerEl,
        viewport
      });
      entry.textLayer = textLayer;
      await Promise.all([entry.renderTask.promise, textLayer.render()]);
    } catch (err) {
      // Cancellations are expected when scrolling fast or zooming.
      if (err instanceof Error && err.name !== 'RenderingCancelledException') {
        console.error(`Error rendering page ${pageNum}:`, err);
      }
    }
  }

  let renderScaleTimer: ReturnType<typeof setTimeout> | null = null;

  /* Re-render visible pages when the effective scale settles. Wrapper sizes
     update reactively right away, so the layout never jumps afterwards. */
  $effect(() => {
    const targetScale = scale;
    if (!browser || !baseSizes.length) return;
    if (renderScaleTimer) clearTimeout(renderScaleTimer);
    renderScaleTimer = setTimeout(() => {
      for (const pageNum of [...rendered.keys()]) {
        if (!intersecting.has(pageNum)) destroyPage(pageNum);
      }
      for (const pageNum of intersecting) {
        void renderPage(pageNum, targetScale);
      }
    }, 150);
  });

  /* Observe pages once the placeholders exist. */
  $effect(() => {
    if (!browser || !scroller || !baseSizes.length) return;
    const els = pageEls.slice(0, baseSizes.length);
    if (els.some((el) => !el)) return;

    observer?.disconnect();
    intersecting.clear();
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNum = Number((entry.target as HTMLElement).dataset.page);
          if (!pageNum) continue;
          if (entry.isIntersecting) {
            intersecting.add(pageNum);
            void renderPage(pageNum, scale);
          } else {
            intersecting.delete(pageNum);
            destroyPage(pageNum);
          }
        }
      },
      { root: scroller, rootMargin: '100% 0px' }
    );
    for (const el of els) observer.observe(el!);

    return () => {
      observer?.disconnect();
      observer = null;
    };
  });

  /* Report the page nearest the viewport centre for the toolbar indicator. */
  let scrollRaf = 0;
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      if (!scroller) return;
      const center = scroller.scrollTop + scroller.clientHeight / 2;
      let best = 1;
      let bestDistance = Infinity;
      for (let index = 0; index < pageEls.length; index++) {
        const el = pageEls[index];
        if (!el) continue;
        const mid = el.offsetTop + el.offsetHeight / 2;
        const distance = Math.abs(mid - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index + 1;
        }
      }
      context?.reportVisiblePage(best);
    });
  }

  onMount(() => {
    context?.registerScrollToPage((pageNum) => {
      const el = pageEls[pageNum - 1];
      if (el && scroller) {
        scroller.scrollTo({ top: el.offsetTop - PADDING, behavior: 'smooth' });
      }
    });

    const resizeObserver = new ResizeObserver(() => computeFitScale());
    if (scroller) resizeObserver.observe(scroller);

    return () => {
      destroyed = true;
      resizeObserver.disconnect();
      if (renderScaleTimer) clearTimeout(renderScaleTimer);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      for (const pageNum of [...rendered.keys()]) destroyPage(pageNum);
      pages.clear();
    };
  });

  $effect(() => {
    if (pdf && browser) void measure();
  });
</script>

<div
  bind:this={scroller}
  class={cn('pdf-renderer h-full w-full overflow-auto', className)}
  style="padding: {PADDING}px;"
  onscroll={onScroll}
>
  <div class="flex min-w-fit flex-col items-center gap-4">
    {#each baseSizes as size, index (index)}
      <div
        bind:this={pageEls[index]}
        data-page={index + 1}
        class="relative shrink-0 overflow-hidden rounded border border-border/40 bg-white shadow-md"
        style="width: {size.width * scale}px; height: {size.height * scale}px; --scale-factor: {scale};"
      ></div>
    {/each}
  </div>
</div>

<style>
  /* pdf.js text layer — transparent selectable text aligned over the canvas. */
  :global(.pdf-renderer .textLayer) {
    position: absolute;
    inset: 0;
    overflow: clip;
    line-height: 1;
    text-size-adjust: none;
    forced-color-adjust: none;
    transform-origin: 0 0;
    caret-color: CanvasText;
  }

  :global(.pdf-renderer .textLayer :is(span, br)) {
    color: transparent;
    position: absolute;
    white-space: pre;
    cursor: text;
    transform-origin: 0% 0%;
  }

  :global(.pdf-renderer .textLayer ::selection) {
    background: color-mix(in srgb, var(--z-accent, #0076ff) 30%, transparent);
  }
</style>
