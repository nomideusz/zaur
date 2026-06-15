<script lang="ts">
	import { getContext } from 'svelte';
	import { Select, createListCollection } from '@ark-ui/svelte/select';
	import { Portal } from '@ark-ui/svelte/portal';
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

	// Ark is collection-driven; rebuild when options change. disabled comes from the
	// collection so items don't need an explicit disabled prop.
	const collection = $derived(
		createListCollection({
			items: options,
			isItemDisabled: (item) => item.disabled ?? false
		})
	);
</script>

<!-- Ark value is an array even for single-select. The settings <label for={controlId}>
     targets the focusable trigger, so controlId → ids.trigger. The dropdown matches the
     control width via --reference-width (set on the Positioner from Select.Control). -->
<Select.Root
	{collection}
	value={value ? [value] : []}
	{open}
	onOpenChange={(details) => (open = details.open)}
	onValueChange={(details) => {
		const next = details.value[0];
		if (!next) return;
		if (next !== value) onchange(next);
	}}
	positioning={{ placement: 'bottom-start', gutter: 4, overflowPadding: 12 }}
	ids={a11y?.controlId ? { trigger: a11y.controlId } : undefined}
>
	<Select.Control class={cn('flex min-w-0', !isCompact && 'w-full')}>
		<Select.Trigger
			class={cn(
				isCompact
					? 'z-mobile-picker-trigger z-mobile-picker-trigger--compact'
					: 'z-select-trigger w-full',
				className
			)}
			aria-label={!a11y?.labelId && label ? label : undefined}
			aria-labelledby={a11y?.labelId}
			aria-describedby={a11y?.descId}
		>
			<Select.ValueText
				placeholder={label}
				class={cn('min-w-0 flex-1 text-left', isCompact ? 'truncate' : 'whitespace-nowrap')}
			/>
			<ChevronDown
				class={cn(
					'size-4 shrink-0 text-fg-subtle transition-transform duration-150',
					open && 'rotate-180'
				)}
				aria-hidden="true"
			/>
		</Select.Trigger>
	</Select.Control>

	<Portal>
		<Select.Positioner>
			<Select.Content
				class={cn(
					'z-mobile-picker-menu w-[var(--reference-width)] min-w-[var(--reference-width)] max-h-[min(var(--available-height),17.5rem)] max-w-[calc(100vw-1rem)]',
					isCompact && 'z-mobile-picker-menu--compact'
				)}
			>
				{#each options as option (option.value)}
					<Select.Item
						item={option}
						class={cn(
							'z-mobile-picker-option data-highlighted:bg-surface-sunken data-disabled:opacity-50',
							option.value === value && 'z-mobile-picker-option--active'
						)}
					>
						<Select.ItemText class="min-w-0 truncate">{option.label}</Select.ItemText>
						<Select.ItemIndicator class="sr-only">Selected</Select.ItemIndicator>
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Positioner>
	</Portal>

	<Select.HiddenSelect />
</Select.Root>
