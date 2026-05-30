<script lang="ts">
	import MobilePicker from '$lib/components/ui/MobilePicker.svelte';
	import { cn } from '$lib/utils/cn';

	export interface SettingsSelectOption {
		value: string;
		label: string;
	}

	interface Props {
		value: string;
		options: SettingsSelectOption[];
		onchange: (value: string) => void;
		label: string;
		class?: string;
	}

	let { value, options, onchange, label, class: className = '' }: Props = $props();
</script>

<div class="z-settings-select min-w-0">
	<div class="md:hidden">
		<MobilePicker
			{label}
			{value}
			{options}
			{onchange}
			compact
			class={cn('max-md:w-full max-md:max-w-none', className)}
		/>
	</div>
	<select
		class={cn('z-select hidden w-auto md:block', className)}
		{value}
		onchange={(e) => onchange(e.currentTarget.value)}
	>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</div>
