<script lang="ts">
	import { getContext } from 'svelte';
	import { Select } from 'bits-ui';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import {
		SETTINGS_A11Y,
		type SettingsA11yContext
	} from '$lib/components/settings/settings-control-context';
	import { cn } from '$lib/utils/cn';

	export interface MobilePickerOption {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		label: string;
		value: string;
		options: MobilePickerOption[];
		onchange: (value: string) => void;
		compact?: boolean;
		/** `field` matches settings/desktop select styling; `compact` for shell headers. */
		variant?: 'compact' | 'field';
		class?: string;
	}

	let {
		label,
		value,
		options,
		onchange,
		compact = false,
		variant = compact ? 'compact' : 'field',
		class: className = ''
	}: Props = $props();

	let open = $state(false);

	const isCompact = $derived(variant === 'compact');

	const a11y = getContext<SettingsA11yContext | undefined>(SETTINGS_A11Y);

	function handleValueChange(nextValue: string) {
		if (!nextValue) return;
		open = false;
		if (nextValue !== value) onchange(nextValue);
	}
</script>

<Select.Root
	type="single"
	items={options}
	{value}
	bind:open
	onValueChange={handleValueChange}
>
	<Select.Trigger
		id={a11y?.controlId}
		class={cn(
			isCompact ? 'z-mobile-picker-trigger z-mobile-picker-trigger--compact' : 'z-select-trigger',
			className
		)}
		aria-label={!a11y?.labelId && label ? label : undefined}
		aria-labelledby={a11y?.labelId}
		aria-describedby={a11y?.descId}
	>
		<Select.Value placeholder={label} class="min-w-0 flex-1 truncate text-left" />
		<ChevronDown
			class={cn(
				'shrink-0 text-fg-subtle transition-transform duration-150',
				isCompact ? 'size-4' : 'size-4',
				open && 'rotate-180'
			)}
			aria-hidden="true"
		/>
	</Select.Trigger>

	<Select.Portal>
		<Select.Content
			sideOffset={4}
			align="start"
			collisionPadding={12}
			sticky="always"
			updatePositionStrategy="always"
			class={cn(
				'z-mobile-picker-menu w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] max-h-[min(var(--bits-select-content-available-height),17.5rem)] max-w-[calc(100vw-1rem)]',
				isCompact && 'z-mobile-picker-menu--compact'
			)}
		>
			<Select.Viewport>
				{#each options as option (option.value)}
					<Select.Item
						value={option.value}
						label={option.label}
						disabled={option.disabled}
						class={cn(
							'z-mobile-picker-option data-highlighted:bg-surface-sunken data-disabled:opacity-50',
							option.value === value && 'z-mobile-picker-option--active'
						)}
					>
						{#snippet children({ selected })}
							<span class="min-w-0 truncate">{option.label}</span>
							{#if selected}
								<span class="sr-only">Selected</span>
							{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
		</Select.Content>
	</Select.Portal>
</Select.Root>
