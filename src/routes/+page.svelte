<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	export let data;
</script>

<Table.Root>
	<Table.Caption>A list of your recent invoices.</Table.Caption>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-[100px]">Miasto</Table.Head>
			<Table.Head>Dzielnica</Table.Head>
			<Table.Head>Tutył</Table.Head>
			<Table.Head class="text-right">Cena</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each data.ads as ad}
			<Table.Row>
				<Table.Cell class="font-medium">{ad.city}</Table.Cell>
				<Table.Cell>{ad.district}</Table.Cell>
				<Table.Cell>{ad.title}</Table.Cell>
				<Table.Cell class="text-right">{ad.price} zł</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
