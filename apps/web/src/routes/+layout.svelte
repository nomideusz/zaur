<script lang="ts">
	import '@zaur/ui/css/zaur.css';
	import '$lib/landing.css';
	import { onMount } from 'svelte';
	import World from '$lib/World.svelte';

	let { children } = $props();

	onMount(() => {
		// Keep the time-adaptive palette drifting while the tab stays open.
		(window as { ZaurCircadianSeed?: { startCircadianLoop?: () => void } }).ZaurCircadianSeed?.startCircadianLoop?.();
	});
</script>

<World />

<div class="z-site-shell">
	<header class="z-site-header z-panel">
		<div class="z-site-header__inner zw-container">
			<a href="/" class="zw-brand z-type-brand" aria-label="Zaur home">
				<span>ZAUR</span>
			</a>
			<nav class="z-site-nav zw-site-nav" aria-label="Primary">
				<a href="/#apps" class="z-site-nav__link">Apps</a>
				<a href="/#packages" class="z-site-nav__link">Packages</a>
				<a href="/#templates" class="z-site-nav__link">Templates</a>
				<a href="https://register.zaur.app" class="z-site-nav__link zw-site-nav__cta">Get an address</a>
			</nav>
		</div>
	</header>

	<main class="z-site-main">
		{@render children()}
	</main>

	<footer class="z-site-footer">
		<div class="z-site-footer__inner zw-container">
			<span>© 2026 Zaur</span>
			<nav class="zw-footer-links" aria-label="Footer">
				<a href="https://register.zaur.app">Register</a>
				<a href="https://webmail.zaur.app">Webmail</a>
				<a href="mailto:nom@zaur.app">nom@zaur.app</a>
			</nav>
		</div>
	</footer>
</div>
