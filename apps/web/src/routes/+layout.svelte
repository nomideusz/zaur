<script lang="ts">
	import '#lib/poster.css';
	import display from '#lib/fonts/inter-tight-latin-700.woff2?url';
	import text from '#lib/fonts/inter-tight-latin-500.woff2?url';
	import cyrillic from '#lib/fonts/inter-tight-cyrillic-var.woff2?url';
	import { i18n } from '#lib/i18n';
	import { keys } from '#lib/keys.svelte';

	let { data, children } = $props();
	// The loader is synchronous, so this switches before the page renders: the
	// prerendered HTML and the hydrated page are in the same language. A switch
	// reloads the page, so the locale never changes under a mounted page.
	// svelte-ignore state_referenced_locally
	i18n.setLocale(data.locale);
	// A key has no spaces to wrap at: let it break anywhere rather than run into the next column.
	$effect(() => {
		document.documentElement.classList.toggle('keys-on', keys.on);
	});
</script>

<svelte:head>
	{#if data.locale === 'uk'}
		<link rel="preload" href={cyrillic} as="font" type="font/woff2" crossorigin="anonymous" />
	{:else}
		<link rel="preload" href={display} as="font" type="font/woff2" crossorigin="anonymous" />
	{/if}
	<link rel="preload" href={text} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

{#key keys.on}{@render children()}{/key}
