<script lang="ts">
	import * as Table from '$lib/components/ui/table';
  import * as Pagination from "$lib/components/ui/pagination";
  import { onMount, tick } from 'svelte';
  import { ads } from '$lib/adsStore';
  import { subscribeToAds } from '$lib/subscribeToAds';
  import { fade } from 'svelte/transition';

  let time = new Date();

  function isNewAd(ad) {
    const adTime = new Date(ad.created_at).getTime();
    const now = new Date().getTime();
    return now - adTime < 10 * 60 * 1000; // 10 minut w milisekundach
  }
  onMount(() => {
    subscribeToAds();
	});


</script>

<Table.Root>
	<Table.Caption>
    <Pagination.Root count={100} perPage={10} let:pages let:currentPage>
    <Pagination.Content>
      <Pagination.Item>
        <Pagination.PrevButton />
      </Pagination.Item>
      {#each pages as page (page.key)}
        {#if page.type === "ellipsis"}
          <Pagination.Item>
            <Pagination.Ellipsis />
          </Pagination.Item>
        {:else}
          <Pagination.Item isVisible={currentPage == page.value}>
            <Pagination.Link {page} isActive={currentPage == page.value}>
              {page.value}
            </Pagination.Link>
          </Pagination.Item>
        {/if}
      {/each}
      <Pagination.Item>
        <Pagination.NextButton />
      </Pagination.Item>
    </Pagination.Content>
  </Pagination.Root></Table.Caption>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-[100px]">Miasto</Table.Head>
			<Table.Head>Dzielnica</Table.Head>
			<Table.Head>Tutył</Table.Head>
			<Table.Head class="text-right">Cena</Table.Head>
      <Table.Head class="text-right">m2</Table.Head>
      <Table.Head class="text-right">Cena/m2</Table.Head>
      <Table.Head class="text-right">Dodano</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each $ads as ad}
			<Table.Row class="{isNewAd(ad) ? 'bg-primary' : ''}">
				<Table.Cell class="font-medium">{ad.city}</Table.Cell>
				<Table.Cell>{ad.district}</Table.Cell>
				<Table.Cell><a href={ad.ad_link} target="_blank">{ad.title}</a></Table.Cell>
				<Table.Cell class="text-right">{ad.price} zł</Table.Cell>
        <Table.Cell class="text-right">{ad.sqm}</Table.Cell>
        <Table.Cell class="text-right">{ad.price_per_sqm} zł</Table.Cell>
        <Table.Cell class="text-right">{ad.date}</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
