<script>
	import '../app.pcss';
</script>

<body>
	<header class="z-50 flex w-full flex-wrap text-sm sm:flex-nowrap sm:justify-start">
		<nav
			class="relative mx-auto w-full container px-4 py-3 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-0 lg:px-8"
			aria-label="Global"
		>
			<div class="flex items-center justify-between py-6">
				<a class="flex-none text-xl font-semibold" href="#" aria-label="Brand">Zaur</a>
			</div>
		</nav>
	</header>

	<main id="content" role="main">
		<div
			class="mx-auto min-h-screen container px-4 pt-10 pb-24 sm:px-6 lg:px-8"
		>
			<slot />
		</div>
	</main>
</body>
