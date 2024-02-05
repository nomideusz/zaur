<script lang="ts">
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { onMount } from 'svelte';
	export let filterValues: string[] = [];
	export let options = []; // Lista opcji w formacie { value: string, label: string }

	// function onValueChange(newValue: string[]) {
	// 	filterValues = newValue;
	// 	console.log(filterValues);
	// }
    const handleSelect = (currentValue: string, isSelected: boolean) => {
        if (isSelected) {
            if (!filterValues.includes(currentValue)) {
                filterValues = [...filterValues, currentValue];
            }
        } else {
            filterValues = filterValues.filter((v) => v !== currentValue);
        }
    };

    onMount(() => {
        filterValues = options.map(option => option.value);
    });
</script>

<!-- <ToggleGroup.Root variant="outline" type="multiple" onValueChange={onValueChange} value={filterValues}>
	{#each options as option}
		<ToggleGroup.Item value={option.value} class="font-bold">{option.label}</ToggleGroup.Item>
	{/each}
</ToggleGroup.Root> -->

{#each options as option}
    <div class="flex items-center space-x-2">
        <Checkbox
            id="terms-{option.value}"
            checked={filterValues.includes(option.value)}
            value={option.value}
            onCheckedChange={(isSelected) => {
                handleSelect(option.value, isSelected);
            }}
            aria-labelledby="terms-label-{option.value}"
        />
        <Label
            id="terms-label-{option.value}"
            for="terms-{option.value}"
            class="text-sm font-medium capitalize leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
            {option.label}
        </Label>
    </div>
{/each}

