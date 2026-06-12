<script lang="ts" module>
  export interface PdfToolbarProps {
    class?: string;
  }
</script>

<script lang="ts">
  import { getContext } from 'svelte';
  import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
  import ChevronUp from '$lib/components/icons/ChevronUp.svelte';
  import Minus from '$lib/components/icons/Minus.svelte';
  import Plus from '$lib/components/icons/Plus.svelte';
  import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
  import { cn } from '$lib/utils/cn';
  import { PDF_VIEWER_CTX, type PdfViewerContext } from './Root.svelte';

  let { class: className = '' }: PdfToolbarProps = $props();

  const context = getContext<PdfViewerContext>(PDF_VIEWER_CTX);

  const currentPage = $derived(context?.currentPage ?? 1);
  const totalPages = $derived(context?.totalPages ?? 0);
  const zoomPercent = $derived(Math.round((context?.zoom ?? 1) * 100));

  const btn =
    'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg disabled:cursor-default disabled:opacity-40';
</script>

<div class={cn('flex items-center gap-1', className)} role="toolbar" aria-label="PDF controls">
  <TooltipWrap label="Previous page">
    {#snippet trigger({ props })}
      <button
        {...props}
        type="button"
        class={btn}
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onclick={() => context?.setPage(currentPage - 1)}
      >
        <ChevronUp class="size-4" aria-hidden="true" />
      </button>
    {/snippet}
  </TooltipWrap>
  <span class="min-w-12 text-center text-xs tabular-nums text-fg-muted select-none">
    {currentPage} / {totalPages}
  </span>
  <TooltipWrap label="Next page">
    {#snippet trigger({ props })}
      <button
        {...props}
        type="button"
        class={btn}
        aria-label="Next page"
        disabled={currentPage >= totalPages}
        onclick={() => context?.setPage(currentPage + 1)}
      >
        <ChevronDown class="size-4" aria-hidden="true" />
      </button>
    {/snippet}
  </TooltipWrap>

  <span class="mx-1 h-4 w-px bg-border" aria-hidden="true"></span>

  <TooltipWrap label="Zoom out">
    {#snippet trigger({ props })}
      <button {...props} type="button" class={btn} aria-label="Zoom out" onclick={() => context?.zoomOut()}>
        <Minus class="size-4" aria-hidden="true" />
      </button>
    {/snippet}
  </TooltipWrap>
  <TooltipWrap label="Reset zoom (fit width)">
    {#snippet trigger({ props })}
      <button
        {...props}
        type="button"
        class="min-w-12 cursor-pointer rounded-md px-1 py-1 text-center text-xs tabular-nums text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
        aria-label="Reset zoom"
        onclick={() => context?.resetZoom()}
      >
        {zoomPercent}%
      </button>
    {/snippet}
  </TooltipWrap>
  <TooltipWrap label="Zoom in">
    {#snippet trigger({ props })}
      <button {...props} type="button" class={btn} aria-label="Zoom in" onclick={() => context?.zoomIn()}>
        <Plus class="size-4" aria-hidden="true" />
      </button>
    {/snippet}
  </TooltipWrap>
</div>
