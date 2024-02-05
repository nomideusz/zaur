<script lang="ts">
	import DataTableHeading from './data-table-heading.svelte';
	import { onMount, tick } from 'svelte';
	import Time, { svelteTime } from 'svelte-time';
	import { dayjs } from 'svelte-time';
	import * as HoverCard from '$lib/components/ui/hover-card';
    import { ads } from '$lib/adsStore';
    import { writable, derived } from 'svelte/store';
    import autoAnimate from '@formkit/auto-animate';
	import { subscribeToAds } from '$lib/subscribeToAds';
	import NumberRangeFilter from '$lib/utils/NumberRangeFilter.svelte';
	import { formatter, squareMeterFormatter } from '$lib/utils/formatter';
	import { typeFilter, numberRangeFilter, districtFilter, booleanFilter } from '$lib/utils/filter';
	import { createTable, Render, Subscribe, createRender } from 'svelte-headless-table';
	import {
		addPagination,
		addSortBy,
		addTableFilter,
		addHiddenColumns,
		addColumnFilters
	} from 'svelte-headless-table/plugins';
	import { Button } from '$lib/components/ui/button';

	import * as Table from '$lib/components/ui/table';
	import DataTableActions from './data-table-actions.svelte';
	import DataTablePagination from './data-table-pagination.svelte';
	import { CaretSort, ChevronDown } from 'radix-icons-svelte';
	import { Badge } from '$lib/components/ui/badge';
	export let section; // 'sales' lub 'rental'
	export let ads_data;
	ads.set(ads_data);

	const data = writable([]);
	$: $data = $ads.filter(ad => ad.section === section);
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
			accessor: 'property_type',
			header: 'Rodzaj',
			plugins: {
				sort: {
					disable: false
				},
				filter: {
					exclude: true
				},
				colFilter: {
					fn: typeFilter,
					initialFilterValue: []
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
		}),
		table.column({
			accessor: 'image_url',
			header: '',
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

    const propertyTypes = derived(data, ($data) => {
		const uniqueTypes = new Set();
		$data.forEach((ad) => {
			if (ad.property_type) {
				uniqueTypes.add(ad.property_type);
			}
		});
		return Array.from(uniqueTypes);
	});

	const ids = flatColumns.map((col) => col.id);
	let hideForId = Object.fromEntries(ids.map((id) => [id, !['city', 'created_at', 'image_url'].includes(id)]));

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

<DataTableHeading
	bind:hideForId
	{filterValue}
	{filterValues}
	{districts}
    {propertyTypes}
	{flatColumns}
	{hidableCols}
/>
<div class="rounded-md border">
	<!-- <pre>$filterValues = {JSON.stringify($filterValues, null, 2)}</pre> -->
	<Table.Root {...$tableAttrs}>
		<Table.Header>
			{#each $headerRows as headerRow}
				<Subscribe rowAttrs={headerRow.attrs()}>
					<Table.Row>
						{#each headerRow.cells as cell (cell.id)}
							<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
								<Table.Head {...attrs}>
									{#if cell.id === 'price' || cell.id === 'price_per_sqm' || cell.id === 'sqm'}
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
									{:else if cell.id === 'district' || cell.id === 'title' || cell.id === 'date'}
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
									{#if cell.id === 'price' || cell.id === 'price_per_sqm' || cell.id === 'sqm'}
										<div class="text-right font-medium">
											<Render of={cell.render()} />
										</div>
									{:else if cell.id === 'date'}
										<div class="text-center font-medium">
											<Render of={cell.render()} />
											<div class="text-xs text-muted-foreground">
												<p>zaured</p>
												<time
													use:svelteTime={{
														relative: true,
														timestamp: row.original.created_at,
														live: true
													}}
												/>
											</div>
										</div>
									{:else if cell.id === 'city'}
										<div class="capitalize">
											<Render of={cell.render()} />
										</div>
									{:else if cell.id === 'title'}
										{#if isNewAd(row.original.created_at)}
											<Badge class="mr-2 font-bold">New</Badge>
										{/if}
										<HoverCard.Root>
											<HoverCard.Trigger
												href={row.original.ad_link}
												target="_blank"
												rel="noreferrer noopener"
												class="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-black"
											>
												<Render of={cell.render()} />
											</HoverCard.Trigger>
											<HoverCard.Content class="w-auto">
                                                <img src={row.original.image_url} alt={row.original.title} />
											</HoverCard.Content>
										</HoverCard.Root>
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
