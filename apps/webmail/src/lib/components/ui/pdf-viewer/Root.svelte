<script lang="ts" module>
  import { cn } from '$lib/utils/cn';
  import type { PDFDocumentProxy } from 'pdfjs-dist';
  import type { Snippet } from 'svelte';

  export interface PdfViewerContext {
    currentPage: number;
    totalPages: number;
    /** User zoom multiplier on top of the fit-to-width scale (1 = fit width). */
    zoom: number;
    pdf: PDFDocumentProxy | null;
    loading: boolean;
    error: string | null;
    setPage: (page: number) => void;
    /** Renderer registers this so the toolbar's page navigation can scroll. */
    registerScrollToPage: (fn: (page: number) => void) => void;
    /** Renderer reports the page currently dominating the viewport. */
    reportVisiblePage: (page: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
  }

  export type PdfDocumentSource = string | Blob | ArrayBuffer | Uint8Array;

  export interface PdfViewerRootProps {
    src: PdfDocumentSource;
    children?: Snippet;
    class?: string;
  }

  export const PDF_VIEWER_CTX = 'pdfViewerContext';
</script>

<script lang="ts">
  import { onMount, setContext } from 'svelte';

  let { src, children, class: className = '' }: PdfViewerRootProps = $props();

  const ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3];

  let currentPage = $state(1);
  let totalPages = $state(0);
  let zoom = $state(1);
  let pdf = $state<PDFDocumentProxy | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let scrollToPage: ((page: number) => void) | null = null;

  function setPage(page: number) {
    const target = Math.max(1, Math.min(totalPages, page));
    scrollToPage?.(target);
  }

  function stepZoom(direction: 1 | -1) {
    const index = ZOOM_STEPS.findIndex((step) => Math.abs(step - zoom) < 0.01);
    const nextIndex =
      index >= 0
        ? index + direction
        : direction > 0
          ? ZOOM_STEPS.findIndex((step) => step > zoom)
          : ZOOM_STEPS.length - 1 - [...ZOOM_STEPS].reverse().findIndex((step) => step < zoom);
    zoom = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, nextIndex))] ?? zoom;
  }

  const context: PdfViewerContext = {
    get currentPage() { return currentPage; },
    get totalPages() { return totalPages; },
    get zoom() { return zoom; },
    get pdf() { return pdf; },
    get loading() { return loading; },
    get error() { return error; },
    setPage,
    registerScrollToPage(fn) { scrollToPage = fn; },
    reportVisiblePage(page) { currentPage = page; },
    zoomIn: () => stepZoom(1),
    zoomOut: () => stepZoom(-1),
    resetZoom: () => { zoom = 1; }
  };

  setContext(PDF_VIEWER_CTX, context);

  async function pdfDocumentParams(source: PdfDocumentSource) {
    if (typeof source === 'string') return { url: source };
    if (source instanceof Blob) return { data: await source.arrayBuffer() };
    return { data: source };
  }

  onMount(() => {
    let destroyed = false;

    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        const doc = await pdfjsLib.getDocument(await pdfDocumentParams(src)).promise;
        if (destroyed) {
          void doc.loadingTask.destroy();
          return;
        }
        pdf = doc;
        totalPages = doc.numPages;
        loading = false;
      } catch (err) {
        if (destroyed) return;
        console.error('Failed to load PDF:', err);
        error = err instanceof Error ? err.message : 'Failed to load PDF';
        loading = false;
      }
    })();

    return () => {
      destroyed = true;
      void pdf?.loadingTask.destroy();
    };
  });
</script>

<div class={cn('pdf-viewer-root relative flex h-full w-full flex-col', className)}>
  {#if loading}
    <div class="flex flex-1 items-center justify-center p-8">
      <div class="flex flex-col items-center gap-3">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
        <span class="text-sm text-fg-muted">Loading PDF…</span>
      </div>
    </div>
  {:else if error}
    <div class="flex flex-1 items-center justify-center p-8">
      <div class="text-center text-danger">
        <p class="font-medium">Error loading PDF</p>
        <p class="text-sm opacity-80">{error}</p>
      </div>
    </div>
  {:else}
    {@render children?.()}
  {/if}
</div>
