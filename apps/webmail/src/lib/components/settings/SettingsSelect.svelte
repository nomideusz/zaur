<script lang="ts">
	import MobilePicker from '$lib/components/ui/MobilePicker.svelte';
	import { cn } from '$lib/utils/cn';

	export interface SettingsSelectOption {
		value: string;
		label: string;
		disabled?: boolean;
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
	<MobilePicker
		{label}
		{value}
		{options}
		{onchange}
		variant="field"
		class={cn('w-full', className)}
	/>
</div>
