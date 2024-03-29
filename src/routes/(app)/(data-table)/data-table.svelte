<script lang="ts">
	import DataTableHeading from './data-table-heading.svelte';
	import { onMount } from 'svelte';
	import { svelteTime } from 'svelte-time';
	import { dayjs } from 'svelte-time';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { ads } from '$lib/adsStore';
	import { writable, derived } from 'svelte/store';
	import { subscribeToAds } from '$lib/subscribeToAds';
	import NumberRangeFilter from '$lib/utils/NumberRangeFilter.svelte';
	import { formatter, squareMeterFormatter } from '$lib/utils/formatter';
	import {
		propertyTypeFilter,
		matchFilter,
		numberRangeFilter,
		districtFilter,
		booleanFilter
	} from '$lib/utils/filter';
	import { createTable, Render, Subscribe, createRender } from 'svelte-headless-table';
	import {
		addPagination,
		addSortBy,
		addTableFilter,
		addHiddenColumns,
		addColumnFilters,
		addDataExport
	} from 'svelte-headless-table/plugins';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import DataTableActions from './data-table-actions.svelte';
	import DataTablePagination from './data-table-pagination.svelte';
	import { CaretSort } from 'radix-icons-svelte';
	import { Badge } from '$lib/components/ui/badge';
	export let section; // 'sales' lub 'rental'
	export let ads_data;
	ads.set(ads_data);
	const data = writable([]);
	$: $data = $ads.filter((ad) => ad.section === section);
	const table = createTable(data, {
		colFilter: addColumnFilters(),
		page: addPagination({ initialPageSize: 100 }),
		sort: addSortBy({ disableMultiSort: true }),
		filter: addTableFilter({
			fn: ({ filterValue, value }) => value.toLowerCase().includes(filterValue.toLowerCase())
		}),
		hide: addHiddenColumns({
			initialHiddenColumnIds: ['city', 'created_at', 'image_url']
		}),
		export: addDataExport()
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
			accessor: 'region_name',
			header: 'Region',
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
					initialFilterValue: [null, null]
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
					initialFilterValue: [null, null]
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
					initialFilterValue: [null, null]
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
					fn: propertyTypeFilter,
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
	const { exportedData } = pluginStates.export;
	const { hiddenColumnIds } = pluginStates.hide;
	const ids = Array.isArray(flatColumns) ? flatColumns.map((col) => col.id) : [];

	let hideForId = Object.fromEntries(
		ids.map((id) => [id, !['city', 'region_name', 'created_at', 'image_url'].includes(id)])
	);

	$: $hiddenColumnIds = Object.entries(hideForId)
		.filter(([, hide]) => !hide)
		.map(([id]) => id);

	const hidableCols = [
		'city',
		'district',
		'region_name',
		'price',
		'sqm',
		'price_per_sqm',
		'date',
		'is_private'
	];

	const officialDistricts = [
		'Stare Miasto',
		'Grzegórzki',
		'Prądnik Czerwony',
		'Prądnik Biały',
		'Krowodrza',
		'Bronowice',
		'Zwierzyniec',
		'Dębniki',
		'Łagiewniki-Borek Fałęcki',
		'Swoszowice',
		'Podgórze Duchackie',
		'Bieżanów-Prokocim',
		'Podgórze',
		'Czyżyny',
		'Mistrzejowice',
		'Bieńczyce',
		'Wzgórza Krzesławickie',
		'Nowa Huta'
	];

	// Bezpośrednie przypisanie listy dzielnic do store
	const districts = writable(officialDistricts);

	const minMaxPrice = derived(exportedData, ($exportedData) => {
		if ($exportedData.length === 0) {
			return { min: null, max: null };
		}

		const prices = $exportedData
			.map((item) => item.price)
			.filter((price) => price != null && !isNaN(price));

		if (prices.length === 0) {
			return { min: null, max: null };
		}

		const minPrice = Math.min(...prices);
		const maxPrice = Math.max(...prices);
		return { min: minPrice, max: maxPrice };
	});

	const minMaxPricePerSqm = derived(exportedData, ($exportedData) => {
		if ($exportedData.length === 0) {
			return { min: null, max: null };
		}

		const pricesPerSqm = $exportedData
			.map((item) => item.price_per_sqm)
			.filter((price_per_sqm) => price_per_sqm != null && !isNaN(price_per_sqm));

		if (pricesPerSqm.length === 0) {
			return { min: null, max: null };
		}

		const minPricePerSqm = Math.min(...pricesPerSqm);
		const maxPricePerSqm = Math.max(...pricesPerSqm);
		return { min: minPricePerSqm, max: maxPricePerSqm };
	});

	const minMaxArea = derived(exportedData, ($exportedData) => {
		if ($exportedData.length === 0) {
			return { min: null, max: null };
		}

		const areas = $exportedData.map((item) => item.sqm).filter((sqm) => sqm != null && !isNaN(sqm));

		if (areas.length === 0) {
			return { min: null, max: null };
		}

		const minArea = Math.min(...areas);
		const maxArea = Math.max(...areas);
		return { min: minArea, max: maxArea };
	});

	const sortOrder = [
		'mieszkania',
		'domy',
		'pokoje',
		'biura-lokale',
		'dzialki',
		'garaze-parkingi',
		'hale-magazyny',
		'pozostale-nieruchomosci'
	];

	const propertyTypes = derived(data, ($data) => {
		const uniqueTypes = new Set();
		$data.forEach((ad) => {
			if (ad.property_type) {
				uniqueTypes.add(ad.property_type);
			}
		});
		const sortedUniqueTypes = Array.from(uniqueTypes).sort((a, b) => {
			return sortOrder.indexOf(a) - sortOrder.indexOf(b);
		});
		return sortedUniqueTypes;
	});

	function isNewAd(createdAt) {
		const adTime = new Date(createdAt).getTime();
		const now = new Date().getTime();
		return now - adTime < 360 * 60 * 1000;
	}

	onMount(() => {
		hideForId['property_type'] = false;
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
	minPrice={$minMaxPrice.min}
	maxPrice={$minMaxPrice.max}
	minPricePerSqm={$minMaxPricePerSqm.min}
	maxPricePerSqm={$minMaxPricePerSqm.max}
	minArea={$minMaxArea.min}
	maxArea={$minMaxArea.max}
/>
<!-- 
<pre>$filterValues = {JSON.stringify(filterValues, null, 2)}</pre> -->
<div class="rounded-md border" style:overflow-x="auto">
	<Table.Root {...$tableAttrs}>
		<Table.Header>
			{#each $headerRows as headerRow (headerRow.id)}
				<Subscribe rowAttrs={headerRow.attrs()} let:rowAttrs>
					<Table.Row {...rowAttrs}>
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
									{:else if cell.id === 'district' || cell.id === 'title' || cell.id === 'date' || cell.id === 'region_name'}
										<Button variant="ghost" on:click={props.sort.toggle}>
											<Render of={cell.render()} />
											<CaretSort class={'ml-2 h-4 w-4'} />
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
				<Subscribe rowAttrs={row.attrs()} let:rowAttrs rowProps={row.props()}>
					<Table.Row {...rowAttrs}>
						{#each row.cells as cell (cell.id)}
							<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()}>
								<Table.Cell {...attrs}>
									{#if cell.id === 'price' || cell.id === 'price_per_sqm' || cell.id === 'sqm'}
										<div class="text-right font-medium">
											<Render of={cell.render()} />
										</div>
									{:else if cell.id === 'date'}
										<div class="text-center font-medium">
											<Render of={cell.render()} />
											<div class="text-xs text-muted-foreground">
												zaured
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
