<script>
	import '../../app.pcss';
	import logo from '$lib/img/zaur.png?enhanced&w=400';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Heart } from 'lucide-svelte';
	let variantSales = 'outline';
	let variantRental = 'outline';
	import { onMount } from 'svelte';
	import { subscribeToAds } from '$lib/subscribeToAds';

	$: variantSales = $page.url.pathname === '/sales' ? 'primary' : 'outline';
	$: variantRental = $page.url.pathname === '/rental' ? 'primary' : 'outline';

	onMount(() => {
		subscribeToAds();
	});
</script>

<main id="content">
	<div class="mx-auto min-h-screen px-4 pt-2 sm:px-6">
		<slot />
	</div>
</main>
