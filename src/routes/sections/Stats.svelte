<script lang="ts">
	import { adsCount } from '$lib/adsCountStore';
	import Button from '$lib/components/ui/button/button.svelte';
	import { onMount } from 'svelte';
	import { SpringValue, format, timerStore } from 'svelte-ux';
	let randomNumber = Math.floor(Math.random() * 9999);
	let numberOfAds: number = 0;
	let numberOfZaurs: number = 0;
	let numberOfRandom: number = 0;

	$: if ($adsCount > 0) {
		numberOfAds += $adsCount;
	}

	onMount(async () => {
		numberOfZaurs += 1;
		numberOfRandom += randomNumber;
	});
</script>

<!-- Features -->
<div class="mx-auto max-w-[85rem] px-4 text-center sm:px-6 lg:px-8">
	<!-- Grid -->
	<div class="mt-20 grid grid-cols-2 gap-6 sm:gap-12 lg:grid-cols-3 lg:gap-8">
		<!-- Stats -->
		<div>
			<h4 data-static class="text-lg font-semibold text-gray-800 dark:text-gray-200 sm:text-xl">
				Number of Ads
			</h4>
			<p class="mt-2 text-4xl font-bold text-blue-200 sm:mt-3 sm:text-6xl">
				<SpringValue
					value={$adsCount}
					format="integer"
					options={{ stiffness: 0.01, damping: 0.25 }}
				/>
			</p>
			<p data-static class="mt-1 text-gray-500">unique ads without ads</p>
		</div>
		<!-- End Stats -->

		<!-- Stats -->
		<div>
			<h4 data-static class="text-lg font-semibold text-gray-800 dark:text-gray-200 sm:text-xl">
				Number of Zaurs
			</h4>
			<p class="mt-2 text-4xl font-bold text-blue-200 sm:mt-3 sm:text-6xl">
				<SpringValue
					value={numberOfZaurs}
					format="integer"
					options={{ stiffness: 0.01, damping: 0.25 }}
				/>
			</p>
			<p data-static class="mt-1 text-gray-500">powerful</p>
		</div>
		<!-- End Stats -->
		<!-- Stats -->
		<div>
			<h4 data-static class="text-lg font-semibold text-gray-800 dark:text-gray-200 sm:text-xl">
				A Random Number
			</h4>
			<p class="mt-2 text-4xl font-bold text-blue-200 sm:mt-3 sm:text-6xl">
				<SpringValue
					value={numberOfRandom}
					format="integer"
					options={{ stiffness: 0.01, damping: 0.25 }}
				/>
			</p>
			<p data-static class="mt-1 text-gray-500">between 0 and 9999</p>
		</div>
		<!-- End Stats -->
	</div>
	<!-- End Grid -->
</div>
<!-- End Features -->
