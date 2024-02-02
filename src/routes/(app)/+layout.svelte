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
			class="mx-auto w-full px-4 py-3 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-2 lg:px-64"
			aria-label="Global"
		>
			<div class="flex items-end">
				<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
					<a class="flex-none" href="/" aria-label="Brand"> Zaur </a>
				</h1>
				<span class="ml-2 text-sm">powered by kurcz.pl</span>
			</div>

			<div>
				<div class="mt-6">
					<Button class="font-bold" size="lg" variant={variantSales} href="/sales">Sprzedaż</Button>
					<Button class="font-bold" size="lg" variant={variantRental} href="/rental">Wynajem</Button
					>
				</div>
			</div>
		</nav>
	</header>
	<main id="content" role="main">
		<div class="mx-auto min-h-screen px-4 pt-10 sm:px-6 lg:px-64">
			<slot />
		</div>
	</main>