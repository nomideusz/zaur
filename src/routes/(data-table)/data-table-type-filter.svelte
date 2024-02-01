<script lang="ts">
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    export let filterValues: string[] = [];
    export let options = []; // Lista opcji w formacie { value: string, label: string }

    // Funkcja wywoływana, gdy wartość grupy przełączników ulegnie zmianie
    function onValueChange(newValue: string[]) {
        filterValues = newValue;
    }
</script>

<ToggleGroup.Root variant="outline" type="multiple" onValueChange={onValueChange} value={filterValues}>
    {#each options as option }
        <ToggleGroup.Item value={option.value}>{option.label}</ToggleGroup.Item>
    {/each}
</ToggleGroup.Root>
