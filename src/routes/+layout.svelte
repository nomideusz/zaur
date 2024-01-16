<script>
	import '../app.pcss';
</script>

<body>
	<header class="z-50 flex w-full flex-wrap text-sm sm:flex-nowrap sm:justify-start">
		<nav
			class="relative mx-auto w-full max-w-[85rem] border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-0 lg:px-8 xl:border-x"
			aria-label="Global"
		>
			<div class="flex items-center justify-between py-6">
				<a class="flex-none text-xl font-semibold" href="#" aria-label="Brand">Zaur</a>
			</div>
		</nav>
	</header>

	<main id="content" role="main">
		<div
			class="mx-auto min-h-screen max-w-[85rem] border-x-gray-200 px-4 py-10 dark:border-x-gray-700 sm:px-6 lg:px-8 xl:border-x"
		>
			<slot />
		</div>
	</main>
</body>
