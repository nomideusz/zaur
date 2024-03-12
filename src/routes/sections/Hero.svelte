<script lang="ts">
	import logo from '$lib/img/zaur.png?enhanced&w=400';
	import Butt from '$lib/components/ui/butt/butt.svelte';
	import { blur } from 'svelte/transition';
	import { circIn, circOut } from 'svelte/easing';
	import { Gooey, timerStore } from 'svelte-ux';
	import { cls } from 'svelte-ux';
	const indexTimer = timerStore({
		initial: 0,
		delay: 4000,
		onTick: (value) => (value ?? 0) + 1
	});
</script>

<main id="content" class="mx-auto flex w-full items-center justify-center text-center">
	<div class="relative z-10 px-4 text-center sm:px-6 lg:px-8">
		<enhanced:img class="mb-4 sm:mb-8" src={logo} alt="Zaur" />

		<Gooey blur={5} alphaPixel={255} alphaShift={-144}>
			{@const words = ['This', 'is', 'Zaur']}
			<div class="h-24 text-8xl font-bold text-blue-200">
				{#key $indexTimer}
					<span
						class="absolute left-0 right-0"
						in:blur={{ amount: '10px', duration: 2000, easing: circOut }}
						out:blur={{ amount: '100px', duration: 2000, easing: circIn }}
					>
						{words[($indexTimer ?? 0) % words.length]}
					</span>
				{/key}
			</div>
		</Gooey>
		<!-- Buttons -->
		<div class="mt-8 flex justify-center">
			<Butt href="/sales">proceed with caution</Butt>
		</div>
		<!-- End Buttons -->
	</div>
</main>
