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

<header class="flex w-full flex-wrap text-sm sm:flex-nowrap sm:justify-start">
	<nav
		class="mx-auto w-full px-4 py-3 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-2"
		aria-label="Global"
	>
		<div>
			<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Nieruchomości</h1>

			<h2
				class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
			>
				Kraków
			</h2>
			<div class="mt-6 flex gap-4">
				<Button class="font-bold" size="lg" variant={variantSales} href="/sales">Sprzedaż</Button>
				<Button class="font-bold" size="lg" variant={variantRental} href="/rental">Wynajem</Button>
			</div>
		</div>
		<div class="flex items-end">
			<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
				<a class="flex-none" href="/" aria-label="Brand"> Zaur </a>
			</h1>
			<span class="ml-2 text-sm">powered by kurcz.pl</span>
		</div>
	</nav>
</header>
<main id="content">
	<div class="mx-auto min-h-screen pt-2 px-4 sm:px-6">
		<slot />
	</div>
</main>
