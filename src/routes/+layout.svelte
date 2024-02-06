<script>
	import '../app.pcss';
	import "@fontsource/jetbrains-mono/400.css";
	import "@fontsource/jetbrains-mono/500.css";
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

<body>
	<header class="flex w-full flex-wrap text-sm sm:flex-nowrap sm:justify-start">
		<nav
			class="mx-auto w-full px-4 py-3 sm:px-6 sm:py-2"
			aria-label="Global"
		>
		<div class="flex items-baseline">
			<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
				<a class="flex-none" href="/" aria-label="Brand"> Zaur </a>
			</h1>
			<span class="ml-2 text-sm">powered by kurcz.pl</span>
		</div>
		<div>
			<h1 class="scroll-m-20 font-extrabold tracking-tight text-3xl border-b pt-6">Nieruchomości Kraków</h1>
			<div class="mt-2 flex gap-4">
				<Button class="font-bold" size="lg" variant={variantSales} href="/sales">Sprzedaż</Button>
				<Button class="font-bold" size="lg" variant={variantRental} href="/rental">Wynajem</Button>
			</div>
		</div>
		</nav>
	</header>
	<main id="content">
		<div class="mx-auto">
			<slot />
		</div>
	</main>
	<footer class="mx-auto w-full max-w-[85rem] px-4 pb-20 sm:px-6 lg:px-8">
		<!-- Grid -->
		<div class="text-center">
			<div>
				<a
					class="flex-none text-xl font-semibold text-black dark:text-white dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
					href="/"
					aria-label="Brand">Zaur</a
				>

				<div class="flex items-center justify-center gap-2 py-3">
					Made with <Heart color="red" fill="red" size="15" /> by nom.
				</div>
			</div>
			<!-- End Col -->
		</div>
		<!-- End Grid -->
	</footer>
</body>
