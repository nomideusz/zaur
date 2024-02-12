<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import DataTableColFilter from './data-table-col-filter.svelte';
	import DataTableTypeFilter from './data-table-type-filter.svelte';
	import { CaretSort, ChevronDown } from 'radix-icons-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	export let hideForId,
		filterValue,
		filterValues,
		districts,
		propertyTypes,
		flatColumns,
		hidableCols;
</script>

<div class="flex items-center pb-4">
	<div class="flex justify-start max-w-fit items-center space-x-4 rounded-md mr-4 px-2">
		<small class="text-sm font-bold leading-none">Wyświetlaj: </small>
		<DataTableTypeFilter
			bind:selectedValues={$filterValues.property_type}
			options={$propertyTypes.map((propertyType) => ({ value: propertyType, label: propertyType }))}
		/>
		<div class="flex items-center space-x-2">
			<Label for="agencies" class="font-bold ml-4">Pokazuj agencje</Label>
			<Switch bind:checked={$filterValues.is_private} id="agencies" />
		</div>
	</div>
	<div class="flex flex-1 items-center space-x-4">
		<Input
			class="max-w-sm font-bold px-4"
			placeholder="Szukaj w tytułach"
			type="text"
			bind:value={$filterValue}
		/>
		<DataTableColFilter
			title="Filtruj według dzielnicy"
			bind:filterValues={$filterValues.district}
			options={$districts.map((district) => ({ value: district, label: district }))}
		/>

	</div>
	<DropdownMenu.Root>
		<DropdownMenu.Trigger asChild let:builder>
			<Button variant="outline" class="ml-auto font-bold" builders={[builder]}>
				Kolumny <ChevronDown class="ml-2 h-4 w-4" />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content>
			{#each flatColumns as col}
				{#if hidableCols.includes(col.id)}
					<DropdownMenu.CheckboxItem bind:checked={hideForId[col.id]}>
						{col.header}
					</DropdownMenu.CheckboxItem>
				{/if}
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>

