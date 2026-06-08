<script lang="ts">
	import { Select } from 'bits-ui';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import { cn } from '$lib/utils/cn';

	export interface MobilePickerOption {
		value: string;
		label: string;
	}

	interface Props {
		label: string;
		value: string;
		options: MobilePickerOption[];
		onchange: (value: string) => void;
		compact?: boolean;
		class?: string;
	}

	let {
		label,
		value,
		options,
		onchange,
		compact = false,
		class: className = ''
	}: Props = $props();

	let open = $state(false);

	const selectedLabel = $derived(
		options.find((option) => option.value === value)?.label ?? label
	);

	function handleValueChange(nextValue: string) {
		if (!nextValue) return;
		open = false;
		if (nextValue !== value) onchange(nextValue);
	}
</script>

<Select.Root
	type="single"
	items={options}
	value={value as never}
	bind:open
	onValueChange={handleValueChange as never}
>
	<Select.Trigger
		class={cn('z-mobile-picker-trigger', compact && 'z-mobile-picker-trigger--compact', className)}
		aria-label={label}
	>
		<span class="z-mobile-picker-trigger__label min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
		<ChevronDown
			class={cn(
				'shrink-0 text-fg-subtle transition-transform duration-150',
				compact ? 'size-4' : 'size-5',
				open && 'rotate-180'
			)}
			aria-hidden="true"
		/>
	</Select.Trigger>

	<Select.Portal>
		<Select.Content
			class={cn(
				'z-mobile-picker-menu w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] max-h-[min(var(--bits-select-content-available-height),17.5rem)]',
				compact && 'z-mobile-picker-menu--compact'
			)}
			sideOffset={4}
			align="start"
		>
			<Select.Viewport>
				{#each options as option (option.value)}
					<Select.Item
						value={option.value}
						label={option.label}
						class={cn(
							'z-mobile-picker-option data-highlighted:bg-surface-sunken',
							option.value === value && 'z-mobile-picker-option--active'
						)}
					>
						{option.label}
					</Select.Item>
				{/each}
			</Select.Viewport>
		</Select.Content>
	</Select.Portal>
</Select.Root>
