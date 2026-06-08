<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export interface PdfToolbarProps {
    class?: string;
    showPageControls?: boolean;
    showZoomControls?: boolean;
    showViewModeToggle?: boolean;
  }
</script>

<script lang="ts">
  import { getContext } from 'svelte';
  import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
  import { cn } from '$lib/utils/cn';
  import type { PdfViewerContext } from './Root.svelte';

  let {
    class: className = '',
    showPageControls = true,
    showZoomControls = true,
    showViewModeToggle = true
  }: PdfToolbarProps = $props();

  const context = getContext<PdfViewerContext>('pdfViewerContext');

  // Derived values from context
  let currentPage = $derived(context.currentPage);
  let totalPages = $derived(context.totalPages);
  let zoom = $derived(context.zoom);
  let viewMode = $derived(context.viewMode);

  let pageInputValue = $state('');
  
  // Sync input with current page
  $effect(() => {
    pageInputValue = String(currentPage);
  });

  function handlePageInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (!isNaN(value) && value >= 1 && value <= totalPages) {
      context.setPage(value);
    }
  }

  function handlePageKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handlePageInput(e);
    }
  }

  function handleZoomSelect(e: Event) {
    const select = e.target as HTMLSelectElement;
    const value = parseFloat(select.value);
    if (!isNaN(value)) {
      context.setZoom(value);
    }
  }

  const zoomPresets = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
</script>

<div
  class={cn(
    'pdf-toolbar flex flex-wrap items-center justify-center gap-3 rounded-lg bg-surface-raised/80 backdrop-blur-md border border-border p-2 shadow-sm',
    className
  )}
>
  {#if showViewModeToggle}
    <div class="flex items-center gap-1">
      <TooltipWrap label="Single page view">
        {#snippet trigger({ props })}
          <button
            {...props}
            onclick={() => context.setViewMode('single')}
            class={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 transition-colors cursor-pointer',
              viewMode === 'single'
                ? 'bg-accent text-accent-fg font-medium border-accent'
                : 'bg-surface text-fg hover:bg-surface-raised'
            )}
            aria-label="Single page view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-4.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </button>
        {/snippet}
      </TooltipWrap>
      <TooltipWrap label="Scroll view (all pages)">
        {#snippet trigger({ props })}
          <button
            {...props}
            onclick={() => context.setViewMode('scroll')}
            class={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 transition-colors cursor-pointer',
              viewMode === 'scroll'
                ? 'bg-accent text-accent-fg font-medium border-accent'
                : 'bg-surface text-fg hover:bg-surface-raised'
            )}
            aria-label="Scroll view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-4.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
            </svg>
          </button>
        {/snippet}
      </TooltipWrap>
    </div>

    <div class="h-6 w-px bg-border/60"></div>
  {/if}

  {#if showPageControls}
    <div class="flex items-center gap-1">
      <TooltipWrap label="Previous page" wrapDisabled={currentPage <= 1}>
        {#snippet trigger({ props })}
          <button
            {...props}
            onclick={() => context.prevPage()}
            disabled={currentPage <= 1}
            class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface border border-border/60 text-fg transition-colors hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Previous page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-4.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        {/snippet}
      </TooltipWrap>

      <div class="flex items-center gap-1.5 px-2">
        <input
          type="text"
          inputmode="numeric"
          value={pageInputValue}
          oninput={(e) => (pageInputValue = (e.target as HTMLInputElement).value)}
          onblur={handlePageInput}
          onkeydown={handlePageKeydown}
          class="h-8 w-12 rounded-md border border-border/60 bg-surface px-2 text-center text-sm font-medium text-fg focus:outline-none focus:border-accent"
          aria-label="Current page"
        />
        <span class="text-sm text-fg-muted select-none">of {totalPages}</span>
      </div>

      <TooltipWrap label="Next page" wrapDisabled={currentPage >= totalPages}>
        {#snippet trigger({ props })}
          <button
            {...props}
            onclick={() => context.nextPage()}
            disabled={currentPage >= totalPages}
            class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface border border-border/60 text-fg transition-colors hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Next page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-4.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        {/snippet}
      </TooltipWrap>
    </div>
  {/if}

  {#if showPageControls && showZoomControls}
    <div class="h-6 w-px bg-border/60"></div>
  {/if}

  {#if showZoomControls}
    <div class="flex items-center gap-1.5">
      <TooltipWrap label="Zoom out" wrapDisabled={zoom <= 0.25}>
        {#snippet trigger({ props })}
          <button
            {...props}
            onclick={() => context.zoomOut()}
            disabled={zoom <= 0.25}
            class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface border border-border/60 text-fg transition-colors hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Zoom out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-4.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
        {/snippet}
      </TooltipWrap>

      <select
        value={zoom}
        onchange={handleZoomSelect}
        class="h-8 rounded-md border border-border/60 bg-surface px-2 text-sm font-medium text-fg focus:outline-none focus:border-accent cursor-pointer"
        aria-label="Zoom level"
      >
        {#each zoomPresets as preset}
          <option value={preset} selected={Math.abs(zoom - preset) < 0.01}>
            {Math.round(preset * 100)}%
          </option>
        {/each}
        {#if !zoomPresets.some((p) => Math.abs(zoom - p) < 0.01)}
          <option value={zoom} selected>{Math.round(zoom * 100)}%</option>
        {/if}
      </select>

      <TooltipWrap label="Zoom in" wrapDisabled={zoom >= 5}>
        {#snippet trigger({ props })}
          <button
            {...props}
            onclick={() => context.zoomIn()}
            disabled={zoom >= 5}
            class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface border border-border/60 text-fg transition-colors hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Zoom in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-4.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        {/snippet}
      </TooltipWrap>

      <TooltipWrap label="Reset to 100%">
        {#snippet trigger({ props })}
          <button
            {...props}
            onclick={() => context.resetZoom()}
            class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface border border-border/60 text-fg transition-colors hover:bg-surface-raised cursor-pointer"
            aria-label="Reset zoom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-4.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6" />
            </svg>
          </button>
        {/snippet}
      </TooltipWrap>
    </div>
  {/if}
</div>
