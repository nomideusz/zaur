<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { ChevronRight, ChevronLeft, DoubleArrowRight,	DoubleArrowLeft } from "radix-icons-svelte";
    import * as Select from "$lib/components/ui/select";

  export let pageIndex;
  export let pageCount;
  export let rows;
  export let pageRows;
  export let pageSize;
  export let hasNextPage;
  export let hasPreviousPage;
</script>
<div class="flex-1 text-sm text-muted-foreground">
  Tabela opiewa na {$rows.length} ogłoszeń
</div>
<div class="flex items-center space-x-6 lg:space-x-8">
<div class="flex items-center space-x-2">
    <p class="text-sm font-medium">Ogłoszeń na stronę</p>
    <Select.Root
      onSelectedChange={(selected) => pageSize.set(Number(selected?.value))}
      selected={{ value: 100, label: "100" }}
    >
      <Select.Trigger class="w-[180px]">
        <Select.Value placeholder="Select page size" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="25">25</Select.Item>
        <Select.Item value="50">50</Select.Item>
        <Select.Item value="100">100</Select.Item>
        <Select.Item value="200">200</Select.Item>
      </Select.Content>
    </Select.Root>
  </div>
  <div class="flex w-[100px] items-center justify-center text-sm font-medium">
    Strona {$pageIndex + 1} z {$pageCount}
  </div>
  <div class="flex items-center space-x-2">
    <Button
      variant="outline"
      class="hidden h-8 w-8 p-0 lg:flex"
      on:click={() => ($pageIndex = 0)}
      disabled={!$hasPreviousPage}
    >
      <span class="sr-only">Pierwsza strona</span>
      <DoubleArrowLeft size={15} />
    </Button>
    <Button
      variant="outline"
      class="p-0 w-8 h-8"
      on:click={() => ($pageIndex = $pageIndex - 1)}
      disabled={!$hasPreviousPage}
    >
      <span class="sr-only">Poprzednia strona</span>
      <ChevronLeft size={15} />
    </Button>
    <Button
      variant="outline"
      class="p-0 w-8 h-8"
      disabled={!$hasNextPage}
      on:click={() => ($pageIndex = $pageIndex + 1)}
    >
      <span class="sr-only">Następna strona</span>
      <ChevronRight size={15} />
    </Button>
    <Button
      variant="outline"
      class="hidden h-8 w-8 p-0 lg:flex"
      disabled={!$hasNextPage}
      on:click={() => ($pageIndex = Math.ceil($rows.length / $pageRows.length) - 1)}
    >
      <span class="sr-only">Ostatnia strona</span>
      <DoubleArrowRight size={15} />
    </Button>
  </div>
</div>