<script lang="ts">
  import { cn } from '$lib/utils/cn';

  interface Props {
    checked: boolean;
    label?: string;
    description?: string;
    class?: string;
    disabled?: boolean;
    onchange?: (checked: boolean) => void;
  }

  let {
    checked = $bindable(false),
    label = '',
    description = '',
    class: className = '',
    disabled = false,
    onchange
  }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<label
  class={cn(
    'inline-flex items-center justify-between gap-4 cursor-pointer select-none group',
    disabled && 'opacity-40 cursor-not-allowed',
    className
  )}
>
  {#if label || description}
    <div class="flex flex-col gap-0.5">
      {#if label}
        <span class="text-sm font-medium text-fg transition-colors">
          {label}
        </span>
      {/if}
      {#if description}
        <span class="text-xs text-fg-muted">
          {description}
        </span>
      {/if}
    </div>
  {/if}

  <div class="relative shrink-0">
    <input
      type="checkbox"
      bind:checked={checked}
      {disabled}
      class="sr-only peer"
      onchange={(e) => onchange?.(e.currentTarget.checked)}
    />
    <div
      class="w-11 h-6 bg-surface-sunken rounded-full border border-border/70 peer-checked:bg-accent peer-checked:border-accent transition-colors duration-200"
    ></div>
    <div
      class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-5 shadow-sm"
    ></div>
  </div>
</label>
