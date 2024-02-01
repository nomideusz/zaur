<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import DataTableColFilter from '../(data-table)/data-table-col-filter.svelte';
    import DataTableTypeFilter from './data-table-type-filter.svelte';
	import { CaretSort, ChevronDown } from 'radix-icons-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
    export let hideForId, filterValue, filterValues, districts, propertyTypes, flatColumns, hidableCols;
</script>



<div class="flex items-center justify-between py-4">
    <div class="flex flex-1 items-center space-x-2">
        <DataTableColFilter
            title="Filtruj według dzielnicy"
            bind:districtFilterValues={$filterValues.district}
            options={$districts.map((district) => ({ value: district, label: district }))}
        />
        <Input
            class="max-w-sm"
            placeholder="Szukaj w tytułach"
            type="text"
            bind:value={$filterValue}
        />
        <DataTableTypeFilter 
            bind:filterValues={$filterValues.propertyTypes}
            options={$propertyTypes.map((type) => ({ value: type, label: type }))}
        />
        <div class="flex items-center space-x-2">
            <Label for="agencies">Agencje</Label>
            <Switch bind:checked={$filterValues.is_private} id="agencies" />
        </div>
    </div>

    <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild let:builder>
            <Button variant="outline" class="ml-auto" builders={[builder]}>
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