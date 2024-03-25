<script lang="ts">
	import '../app.pcss';
	import '@fontsource/jetbrains-mono/400.css';
	import '@fontsource/jetbrains-mono/500.css';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Heart, Sun, Moon } from 'lucide-svelte';
	let variantSales = 'outline';
	let variantRental = 'outline';
	import { onMount } from 'svelte';
	import { subscribeToAds } from '$lib/subscribeToAds';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';
	import { toggleMode } from 'mode-watcher';
	import { loadingAction } from 'svelte-legos';
	import { goto } from '$app/navigation';

	let loadingSales = false;
	let loadingRental = false;

	function navigateTo(path: string | URL) {
		if (path === '/sales') {
			loadingSales = true;
		} else if (path === '/rental') {
			loadingRental = true;
		}

		goto(path).then(() => {
			loadingSales = false;
			loadingRental = false;
		});
	}

	$: variantSales = $page.url.pathname === '/sales' ? 'primary' : 'outline';
	$: variantRental = $page.url.pathname === '/rental' ? 'primary' : 'outline';

	onMount(() => {
		subscribeToAds();
	});
</script>

<Toaster richColors position="top-center" theme="light" />
<ModeWatcher />

<header class="flex w-full flex-wrap text-sm sm:flex-nowrap sm:justify-start">
	<nav class="mx-auto w-full px-4 py-3 sm:px-6 sm:py-2" aria-label="Global">
		<div class="flex items-baseline">
			<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
				<a class="flex-none" href="/" aria-label="Brand"> Zaur </a>
			</h1>
			<span class="ml-2 text-sm">powered by kurcz.pl</span>
		</div>
		<div>
			<h1 class="scroll-m-20 border-b pt-6 text-3xl font-extrabold tracking-tight">
				Nieruchomości Kraków
			</h1>
			<div class="mt-2 flex gap-4">
				<span class="rounded-md" use:loadingAction={loadingSales}
					><Button
						on:click={() => navigateTo('/sales')}
						class="font-bold"
						size="lg"
						variant={variantSales}>Sprzedaż</Button
					></span
				>
				<span class="rounded-md" use:loadingAction={loadingRental}
					><Button
						on:click={() => navigateTo('/rental')}
						class="font-bold"
						size="lg"
						variant={variantRental}>Wynajem</Button
					></span
				>
			</div>
		</div>
	</nav>
	<Button on:click={toggleMode} variant="outline" size="icon">
		<Sun
			class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
		/>
		<Moon
			class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
		/>
		<span class="sr-only">Toggle theme</span>
	</Button>
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
