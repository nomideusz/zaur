<script lang="ts">
	import { getContext } from 'svelte';
	import { RadioGroup } from '@ark-ui/svelte/radio-group';
	import {
		SETTINGS_A11Y,
		type SettingsA11yContext
	} from '$lib/components/settings/settings-control-context';
	import { cn } from '$lib/utils/cn';

	export interface RadioGroupOption {
		value: string;
		label: string;
		description?: string;
		disabled?: boolean;
	}

	interface Props {
		value: string;
		options: RadioGroupOption[];
		/** Fallback accessible name outside SettingsRow. */
		label?: string;
		class?: string;
		disabled?: boolean;
		onchange?: (value: string) => void;
	}

	let {
		value,
		options,
		label,
		class: className = '',
		disabled = false,
		onchange
	}: Props = $props();

	const a11y = getContext<SettingsA11yContext | undefined>(SETTINGS_A11Y);
</script>

<RadioGroup.Root
	{value}
	{disabled}
	class={cn('z-radio-group', className)}
	ids={a11y?.controlId ? { root: a11y.controlId } : undefined}
	aria-label={!a11y?.labelId && label ? label : undefined}
	aria-labelledby={a11y?.labelId}
	aria-describedby={a11y?.descId}
	onValueChange={(details) => {
		if (details.value != null) onchange?.(details.value);
	}}
>
	{#each options as option (option.value)}
		<RadioGroup.Item
			value={option.value}
			disabled={option.disabled}
			class="z-radio-group__item"
		>
			<RadioGroup.ItemControl class="z-radio-group__control">
				<div class="z-radio-group__dot"></div>
			</RadioGroup.ItemControl>
			<span class="z-radio-group__copy">
				<RadioGroup.ItemText class="z-radio-group__label">{option.label}</RadioGroup.ItemText>
				{#if option.description}
					<span class="z-radio-group__desc">{option.description}</span>
				{/if}
			</span>
			<RadioGroup.ItemHiddenInput />
		</RadioGroup.Item>
	{/each}
</RadioGroup.Root>
