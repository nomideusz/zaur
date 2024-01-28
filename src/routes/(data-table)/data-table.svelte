<script lang="ts">
    import DataTableHeading from '../(data-table)/data-table-heading.svelte';
import { onMount, tick } from 'svelte';
import Time, { svelteTime } from "svelte-time";
  import { dayjs } from "svelte-time";

  let time = dayjs().format("MMM DD, YYYY");
  let relativeTime = dayjs().from(dayjs());
import { ads } from '$lib/adsStore';
import { subscribeToAds } from '$lib/subscribeToAds';
import NumberRangeFilter from '$lib/utils/NumberRangeFilter.svelte';
import { formatter, squareMeterFormatter } from '$lib/utils/formatter';
import { isNumber, numberRangeFilter, districtFilter, booleanFilter } from '$lib/utils/filter';
import { createTable, Render, Subscribe, createRender } from 'svelte-headless-table';
import {
    addPagination,
    addSortBy,
    addTableFilter,
    addHiddenColumns,
    addColumnFilters
} from 'svelte-headless-table/plugins';
import { Button } from '$lib/components/ui/button';
import { get, readable, writable, derived } from 'svelte/store';
import * as Table from '$lib/components/ui/table';
import DataTableActions from '../(data-table)/data-table-actions.svelte';
import DataTablePagination from '../(data-table)/data-table-pagination.svelte';
import { CaretSort, ChevronDown } from 'radix-icons-svelte';
import { Badge } from '$lib/components/ui/badge';

const data = writable([]);
$: $data = $ads;
const table = createTable(data, {
    colFilter: addColumnFilters(),
    page: addPagination({ initialPageSize: 100 }),
    sort: addSortBy({ disableMultiSort: true }),
    filter: addTableFilter({
        fn: ({ filterValue, value }) => value.toLowerCase().includes(filterValue.toLowerCase())
    }),

    hide: addHiddenColumns({
        initialHiddenColumnIds: []
    })
});

const columns = table.createColumns([
    table.column({
        accessor: 'city',
        header: 'Miasto',
        plugins: {
            sort: {
                disable: true
            },
            filter: {
                exclude: true
            },
            colFilter: {
                fn: districtFilter,
                initialFilterValue: []
            }
        }
    }),
    table.column({
        accessor: 'district',
        header: 'Dzielnica',
        plugins: {
            sort: {
                disable: false
            },
            filter: {
                exclude: true
            },
            colFilter: {
                fn: districtFilter,
                initialFilterValue: []
            }
        }
    }),
    table.column({
        accessor: 'title',
        header: 'Tytuł',
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
        accessor: 'price',
        header: 'Cena',
        cell: ({ value }) => {
            return formatter(value);
        },
        plugins: {
            sort: {
                disable: false
            },
            filter: {
                exclude: true
            },
            colFilter: {
                fn: numberRangeFilter,
                initialFilterValue: [null, null],
                render: ({ filterValue, values }) =>
                    createRender(NumberRangeFilter, { filterValue, values, formatter })
            }
        }
    }),
    table.column({
        accessor: 'sqm',
        header: 'm2',
        cell: ({ value }) => {
            return squareMeterFormatter(value);
        },
        plugins: {
            sort: {
                disable: false
            },
            filter: {
                exclude: true
            },
            colFilter: {
                fn: numberRangeFilter,
                initialFilterValue: [null, null],
                render: ({ filterValue, values }) =>
                    createRender(NumberRangeFilter, {
                        filterValue,
                        values,
                        formatter: squareMeterFormatter
                    })
            }
        }
    }),
    table.column({
        accessor: 'price_per_sqm',
        header: 'Cena/m2',
        cell: ({ value }) => {
            return formatter(value);
        },
        plugins: {
            sort: {
                disable: false
            },
            filter: {
                exclude: true
            },
            colFilter: {
                fn: numberRangeFilter,
                initialFilterValue: [null, null],
                render: ({ filterValue, values }) =>
                    createRender(NumberRangeFilter, { filterValue, values, formatter })
            }
        }
    }),
    table.column({
        accessor: 'date',
        header: 'Dodano',
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
        accessor: 'created_at',
        header: 'W Zaurze od',
        cell: ({ value }) => {
            let time = dayjs(value).from(dayjs());
            return time;
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
        accessor: 'is_private',
        header: 'Agencja?',
        plugins: {
            sort: {
                disable: false
            },
            filter: {
                exclude: true
            },
            colFilter: {
                fn: booleanFilter,
                initialFilterValue: true
            }
        }
    }),
    table.column({
        accessor: ({ ad_link }) => ad_link,
        header: '',
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
const { filterValues } = pluginStates.colFilter;
const { hiddenColumnIds } = pluginStates.hide;

const districts = derived(data, ($data) => {
    const uniqueDistricts = new Set();
    $data.forEach((ad) => {
        if (ad.district) {
            uniqueDistricts.add(ad.district);
        }
    });
    return Array.from(uniqueDistricts);
});

const values = derived(data, ($data) => {
    const uniquePrices = new Set();
    $data.forEach((ad) => {
        if (ad.price) {
            uniquePrices.add(ad.price);
        }
    });
    return Array.from(uniquePrices);
});

const ids = flatColumns.map((col) => col.id);
let hideForId = Object.fromEntries(ids.map((id) => [id, !['city'].includes(id)]));


$: $hiddenColumnIds = Object.entries(hideForId)
    .filter(([, hide]) => !hide)
    .map(([id]) => id);

const hidableCols = ['city', 'district', 'price', 'sqm', 'price_per_sqm', 'date', 'is_private'];

function isNewAd(createdAt) {
    const adTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    return now - adTime < 360 * 60 * 1000;
}

onMount(() => {
    subscribeToAds();
});
</script>

<DataTableHeading bind:hideForId={hideForId} {filterValue} {filterValues} {districts} {flatColumns} {hidableCols}/>
<div class="rounded-md border">
<Table.Root {...$tableAttrs}>
    <Table.Header>
        {#each $headerRows as headerRow}
            <Subscribe rowAttrs={headerRow.attrs()}>
                <Table.Row>
                    {#each headerRow.cells as cell (cell.id)}
                        <Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
                            <Table.Head {...attrs}>
                                {#if cell.id === 'price' || cell.id === 'price_per_sqm' || cell.id === 'sqm' || cell.id === 'date'}
                                    <div class="text-right">
                                        <Button variant="ghost" on:click={props.sort.toggle}>
                                            <Render of={cell.render()} />
                                            <CaretSort class={'ml-2 h-4 w-4'} />
                                        </Button>
                                    </div>
                                    {#if props.colFilter?.render}
                                        <div>
                                            <Render of={props.colFilter.render} />
                                        </div>
                                    {/if}
                                {:else if cell.id === 'district' || cell.id === 'title'}
                                    <Button variant="ghost" on:click={props.sort.toggle}>
                                        <Render of={cell.render()} />
                                        <CaretSort class={'ml-2 h-4 w-4'} />
                                    </Button>
                                {:else if cell.id === 'is_private'}
                                    <Render of={cell.render()} />
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
                                {#if cell.id === 'price' || cell.id === 'price_per_sqm' || cell.id === 'sqm' || cell.id === 'date'}
                                    <div class="text-right font-medium">
                                        <Render of={cell.render()} />
                                    </div>
                                {:else if cell.id === 'city'}
                                    <div class="capitalize">
                                        <Render of={cell.render()} />
                                    </div>
                                {:else if cell.id === 'title'}
                                    {#if isNewAd(row.original.created_at)}
                                        <Badge class="mr-2 font-bold">New</Badge>
                                    {/if}
                                    <Render of={cell.render()} />
                                {:else if cell.id === 'is_private'}
                                    {#if row.original.is_private}
                                    <Badge variant="outline" class="font-bold">Prywatne</Badge>
                                    {:else}
                                    <Badge variant="primary" class="font-bold">Agencja</Badge>
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
<div class="flex items-center justify-between py-4">
<DataTablePagination
    {pageIndex}
    {pageCount}
    {rows}
    {pageRows}
    {pageSize}
    {hasNextPage}
    {hasPreviousPage}
/>

</div>