<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { ads_sell, ads_rent } from '$lib/adsStore';
	import { subscribeToAds } from '$lib/subscribeToAds';
	import RangeSlider from 'svelte-range-slider-pips';
	import { isNumber } from '$lib/utils/filter';
	import NumberRangeFilter from './NumberRangeFilter.svelte';
	import { formatter, squareMeterFormatter } from '$lib/utils/formatter';
	import {
		textPrefixFilter,
		minFilter,
		numberRangeFilter,
		districtFilter
	} from '$lib/utils/filter';
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
	import DataTableActions from './data-table-actions.svelte';
	import DataTablePagination from './data-table-pagination.svelte';
	import DataTableColFilter from './data-table-col-filter.svelte';
	import { CaretSort, ChevronDown } from 'radix-icons-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';

	let selectedTab = 'sell';
	const data = writable([]);

	$: if (selectedTab === 'sell') {
		data.set($ads_sell);
	} else if (selectedTab === 'rent') {
		data.set($ads_rent);
	}

	// $: $data = $ads;
	const table = createTable(data, {
		colFilter: addColumnFilters(),
		page: addPagination({ initialPageSize: 100 }),
		sort: addSortBy({ disableMultiSort: true }),
		filter: addTableFilter({
			fn: ({ filterValue, value }) => value.toLowerCase().includes(filterValue.toLowerCase())
		}),

		hide: addHiddenColumns({
			initialHiddenColumnIds: ['city', 'is_private']
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
			accessor: 'is_private',
			header: 'Prywatne?',
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
	// let hideForId = Object.fromEntries(ids.map((id) => [id, true]));
	// let hideForId = Object.fromEntries(ids.map((id) => [id, !['city', 'is_private'].includes(id)]));
	$: hideForId = Object.fromEntries(
		ids.map((id) => {
			if (id === 'price_per_sqm') {
				// Ukryj kolumnę price_per_sqm, jeśli wybrana jest zakładka 'rent'
				return [id, selectedTab !== 'rent'];
			} else {
				return [id, !['city', 'is_private'].includes(id)];
			}
		})
	);

	$: $hiddenColumnIds = Object.entries(hideForId)
		.filter(([, hide]) => !hide)
		.map(([id]) => id);

	const hidableCols = ['city', 'district', 'date'];

	function isNewAd(createdAt) {
		const adTime = new Date(createdAt).getTime();
		const now = new Date().getTime();
		return now - adTime < 360 * 60 * 1000;
	}

	$: min = $values.length === 0 ? 0 : Math.min(...$values.filter(isNumber));
	$: max = $values.length === 0 ? 0 : Math.max(...$values.filter(isNumber));
	filterValues.update((currentValues) => ({
		...currentValues,
		price: [min, max]
	}));

	onMount(() => {
		subscribeToAds();
	});
</script>

<!-- <pre>$filterValues = {JSON.stringify($filterValues, null, 2)}</pre> -->

<!-- <RangeSlider
    {formatter}
    range
    pips
    float
    all="label"
    min={min}
    max={max}
    step={1000}
    pipstep={500}
	bind:priceRange

/> -->

<div>
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
		</div>

		<Tabs.Root bind:value={selectedTab} class="mr-2">
			<Tabs.List>
				<Tabs.Trigger value="sell">Sprzedaż</Tabs.Trigger>
				<Tabs.Trigger value="rent">Wynajem</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>

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
											{#if !row.original.is_private}
												<Badge variant="destructive" class="mr-2 font-bold">Agencja</Badge>
											{/if}
											<Render of={cell.render()} />
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
</div>
