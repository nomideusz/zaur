<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { ads } from '$lib/adsStore';
  import { subscribeToAds } from '$lib/subscribeToAds';
  import { fade } from 'svelte/transition';
  import { createTable, Render, Subscribe, createRender } from "svelte-headless-table";
  import { addPagination, addSortBy, addTableFilter, addHiddenColumns } from "svelte-headless-table/plugins";
  import { Button } from "$lib/components/ui/button";
  import { readable } from "svelte/store";
  import * as Table from '$lib/components/ui/table';
  import DataTableActions from "./data-table-actions.svelte";
  import { CaretSort, ChevronDown, ChevronRight, ChevronLeft, DoubleArrowRight,	DoubleArrowLeft } from "radix-icons-svelte";
  import { Badge } from "$lib/components/ui/badge";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Input } from "$lib/components/ui/input";
  import * as Select from "$lib/components/ui/select";

  const table = createTable(readable($ads), {
    page: addPagination({ initialPageSize: 100 }),
    sort: addSortBy({ disableMultiSort: true }),
    filter: addTableFilter({
      fn: ({ filterValue, value }) =>
        value.toLowerCase().includes(filterValue.toLowerCase())
    }),
//     filter: addTableFilter({
//   fn: ({ filterValue, value }) => {
//     const numericFilterValue = Number(filterValue);
//     const numericValue = Number(value);
//     return numericValue <= numericFilterValue;
//   }
// }),

    hide: addHiddenColumns()
  });

  const columns = table.createColumns([
    table.column({
      accessor: "id",
      header: "",
      plugins: {
        sort: {
          disable: true
        },
        filter: {
          exclude: true
        }
      }
    }),
    table.column({
      accessor: "city",
      header: "Miasto",
      plugins: {
        sort: {
          disable: true
        },
        filter: {
          exclude: true
        }
      }
    }),
    table.column({
      accessor: "district",
      header: "Dzielnica",
      plugins: {
        sort: {
          disable: true
        },
        filter: {
          exclude: true
        }
      }
    }),
    table.column({
      accessor: "title",
      header: "Tytuł",
      plugins: {
        sort: {
          disable: true
        },
        filter: {
          exclude: true
        }
      }
    }),
    table.column({
      accessor: "price",
      header: "Cena",
      cell: ({ value }) => {
        const formatted = new Intl.NumberFormat("pl-PL", {
          style: "currency",
          currency: "PLN"
        }).format(value);
        return formatted;
      },
      plugins: {
        sort: {
          disable: false
        },
        filter: {
          exclude: false
        }
      }
    }),
    table.column({
      accessor: "sqm",
      header: "m2",
      plugins: {
        sort: {
          disable: false
        },
        filter: {
          exclude: true
        }
      }
    }),
    table.column({
      accessor: "price_per_sqm",
      header: "Cena/m2",
      cell: ({ value }) => {
        const formatted = new Intl.NumberFormat("pl-PL", {
          style: "currency",
          currency: "PLN"
        }).format(value);
        return formatted;
      },
      plugins: {
        sort: {
          disable: false
        },
        filter: {
          exclude: true
        }
      }
    }),
    table.column({
      accessor: "date",
      header: "Dodano",
    }),
    table.column({
      accessor: ({ ad_link }) => ad_link,
      header: "",
      cell: ({ value }) => {
        return createRender(DataTableActions, { link: value });
      },
      plugins: {
        sort: {
          disable: false
        },
        filter: {
          exclude: true
        }
      }
    })
  ]);

  const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates, flatColumns, rows } =
    table.createViewModel(columns);
  const { hasNextPage, hasPreviousPage, pageIndex, pageCount, pageSize } = pluginStates.page;
  const { filterValue } = pluginStates.filter;
  const { hiddenColumnIds } = pluginStates.hide;

  const ids = flatColumns.map((col) => col.id);
  let hideForId = Object.fromEntries(ids.map((id) => [id, true]));

  $: $hiddenColumnIds = Object.entries(hideForId)
    .filter(([, hide]) => !hide)
    .map(([id]) => id);

  const hidableCols = ["city", "district", "date"];

  function isNewAd(createdAt) {
  const adTime = new Date(createdAt).getTime();
  const now = new Date().getTime();
  return now - adTime < 360 * 60 * 1000;
}


  onMount(() => {
    subscribeToAds();
	});


</script>


<div>
  <div class="flex items-center py-4">
    <Input
      class="max-w-sm"
      placeholder="Szukaj w tytułach"
      type="text"
      bind:value={$filterValue}
    />
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
<div class="rounded-md border">
  <Table.Root {...$tableAttrs}>
    <Table.Header>
      {#each $headerRows as headerRow}
        <Subscribe rowAttrs={headerRow.attrs()}>
          <Table.Row>
            {#each headerRow.cells as cell (cell.id)}
              <Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
                <Table.Head {...attrs}>
                  {#if (cell.id === "price") || (cell.id === "price_per_sqm") || (cell.id === "sqm") || (cell.id === "date")}
                    <div class="text-right">
                      <Button variant="ghost" on:click={props.sort.toggle}>
                        <Render of={cell.render()} />
                        <CaretSort class={"ml-2 h-4 w-4"} />
                      </Button>
                    </div>
                    {:else if cell.id === "title"}
                    <Button variant="ghost" on:click={props.sort.toggle}>
                      <Render of={cell.render()} />
                      <CaretSort class={"ml-2 h-4 w-4"} />
                    </Button>
                  {:else}
                    <Render of={cell.render()} />
                  {/if}
                </Table.Head>
              </Subscribe>
            {/each}
          </Table.Row>
        </Subscribe>
      {/each}
    </Table.Header>
    <Table.Body {...$tableBodyAttrs}>
      {#each $pageRows as row (row.id)}
        <Subscribe rowAttrs={row.attrs()} let:rowAttrs>
          <Table.Row {...rowAttrs}>
            {#each row.cells as cell (cell.id)}
              <Subscribe attrs={cell.attrs()} let:attrs>
                <Table.Cell {...attrs}>
                  {#if (cell.id === "price") || (cell.id === "price_per_sqm") || (cell.id === "sqm") || (cell.id === "date")}
                    <div class="text-right font-medium">
                      <Render of={cell.render()} />
                    </div>
                  {:else if cell.id === "city"}
                    <div class="capitalize">
                      <Render of={cell.render()} />
                    </div>
                  {:else if cell.id === "id"}
                      {#if isNewAd(row.original.created_at)}
                        <Badge class="mr-2">New</Badge>
                      {/if}
                  {:else}
                    <Render of={cell.render()} />
                  {/if}
                </Table.Cell>
              </Subscribe>
            {/each}
          </Table.Row>
        </Subscribe>
      {/each}
    </Table.Body>
  </Table.Root>
</div>
<div class="flex items-center justify-between px-2">
  <div class="flex-1 text-sm text-muted-foreground">
    Zaur opiewa na {$rows.length} ogłoszeń
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
</div>
</div>
