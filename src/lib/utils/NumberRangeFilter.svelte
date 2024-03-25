<script lang="ts">
	import { isNumber } from '$lib/utils/filter';
	// import { formatter } from '$lib/utils/formatter';
	import { Input } from '$lib/components/ui/input';
	import DataTableDistrictFilter from '../../routes/(app)/(data-table)/data-table-district-filter.svelte';

	export let filterValue;
	export let values;
	export let formatter;
	$: min = $values.length === 0 ? 0 : Math.min(...$values.filter(isNumber));
	$: max = $values.length === 0 ? 0 : Math.max(...$values.filter(isNumber));
</script>

<div class="flex">
	<Input
		class="mb-1 h-8 max-w-sm border-dashed text-right text-xs"
		type="text"
		bind:value={$filterValue[0]}
		on:click
		placeholder={`Min (${formatter ? formatter(min) : min})`}
	/>
	<Input
		class="mb-1 h-8 max-w-sm border-dashed text-right text-xs"
		type="text"
		bind:value={$filterValue[1]}
		on:click
		placeholder={`Max (${formatter ? formatter(max) : max})`}
	/>
</div>

<style>
	div {
		display: flex;
		flex-direction: column;
	}
	input {
		width: 5rem;
	}
</style>
