<script lang="ts">
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { onMount } from 'svelte';
	export let selectedValues: string[] = [];
	export let options: { value: string; label: string }[] = [];
	export let allProperties: { type: string; price: number }[] = []; // Przykładowe dane

	onMount(() => {
		selectedValues = ['mieszkania'];
	});

	const handleValueChange = (value: string) => {
		selectedValues = [value];
	};
</script>

<RadioGroup.Root value={selectedValues[0]} onValueChange={handleValueChange}>
	<div class="flex space-x-4">
		{#each options as option}
			<div class="flex items-center space-x-2">
				<RadioGroup.Item value={option.value} id={option.value} />
				<Label for={option.value}>{option.label}</Label>
			</div>
		{/each}
	</div>
</RadioGroup.Root>
