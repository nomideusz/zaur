<script>
	import '../app.pcss';
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
	<main id="content" role="main">
		<div class="mx-auto min-h-screen">
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
