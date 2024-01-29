<script>
	import '../app.pcss';
	import { page } from '$app/stores';
    import Button from '$lib/components/ui/button/button.svelte';

    let variantSales = 'outline';
    let variantRental = 'outline';

    $: variantSales = $page.url.pathname === '/sales' ? 'primary' : 'outline';
    $: variantRental = $page.url.pathname === '/rental' ? 'primary' : 'outline';
</script>

<body>
	<header class="z-50 flex w-full flex-wrap text-sm sm:flex-nowrap sm:justify-start">
		<nav
			class="container relative mx-auto w-full px-4 py-3 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-0 lg:px-8"
			aria-label="Global"
		>
			<div class="flex items-center justify-between py-6">
				<a class="flex-none text-3xl font-bold" href="/" aria-label="Brand">Zaur</a>
			</div>
		</nav>
	</header>
	<main id="content" role="main">
		<div class="container mx-auto min-h-screen px-4 pb-24 pt-10 sm:px-6 lg:px-8">
			<div>
				<Button variant={variantSales} href="/sales">Sprzedaż</Button>
				<Button variant={variantRental} href="/rental">Wynajem</Button>
			</div>
			<slot />
		</div>
	</main>
</body>
