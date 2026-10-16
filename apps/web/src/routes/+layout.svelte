<script lang="ts">
	import '#lib/poster.css';
	import display from '#lib/fonts/inter-tight-latin-700.woff2?url';
	import text from '#lib/fonts/inter-tight-latin-500.woff2?url';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="preload" href={display} as="font" type="font/woff2" crossorigin="anonymous" />
	<link rel="preload" href={text} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

{@render children()}
