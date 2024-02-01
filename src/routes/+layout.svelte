<script>
	import '../app.pcss';
	import logo from '$lib/img/zaur.png?enhanced&w=400';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Heart } from 'lucide-svelte';
	let variantSales = 'outline';
	let variantRental = 'outline';

	$: variantSales = $page.url.pathname === '/sales' ? 'primary' : 'outline';
	$: variantRental = $page.url.pathname === '/rental' ? 'primary' : 'outline';
</script>

<body>
	<header class="flex w-full flex-wrap text-sm sm:flex-nowrap sm:justify-start">
		<nav
			class="container mx-auto w-full px-4 py-3 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-2 lg:px-8"
			aria-label="Global"
		>
			<div class="flex items-end">
				<a class="flex-none text-3xl font-bold" href="/" aria-label="Brand">
					<enhanced:img src={logo} alt="Zaur" />
				</a>
				<span class="text-sm">powered by kurcz.pl</span>
			</div>

			<div>
				<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Nieruchomości</h1>
				<h2 class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">Kraków</h2>
				<div class="mt-6">
					<Button class="font-bold" size="lg" variant={variantSales} href="/sales">Sprzedaż</Button>
					<Button class="font-bold" size="lg" variant={variantRental} href="/rental">Wynajem</Button>
				</div>
			</div>
		</nav>
	</header>
	<main id="content" role="main">
		<div class="container mx-auto min-h-screen px-4 pb-24 pt-10 sm:px-6 lg:px-8">
			<slot />
		</div>
	</main>
	<footer class="mx-auto w-full max-w-[85rem] px-4 pt-10 pb-20 sm:px-6 lg:px-8">
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
