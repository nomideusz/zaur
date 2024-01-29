<script lang="ts">
	import { ads } from '$lib/adsStore';
	import { onMount } from 'svelte';
	import DataTable from '../(data-table)/data-table.svelte';
	export let data;
	onMount(() => {
		ads.set(data.ads ?? []);
	});
</script>

<DataTable />
