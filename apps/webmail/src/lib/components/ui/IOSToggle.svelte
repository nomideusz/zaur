<script lang="ts">
  import { Switch } from 'bits-ui';
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

<Switch.Root
  bind:checked
  {disabled}
  class={cn(
    'inline-flex items-center justify-between gap-4 cursor-pointer select-none group text-left',
    disabled && 'opacity-40 cursor-not-allowed',
    className
  )}
  onCheckedChange={(next) => onchange?.(next)}
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

  <span
    class="relative block h-6 w-11 shrink-0 rounded-full border border-border/70 bg-surface-sunken transition-colors duration-200 group-data-[state=checked]:border-accent group-data-[state=checked]:bg-accent"
    aria-hidden="true"
  >
    <Switch.Thumb
      class="absolute left-1 top-1 block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 data-[state=checked]:translate-x-5"
    />
  </span>
</Switch.Root>
