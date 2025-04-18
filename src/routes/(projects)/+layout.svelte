<script lang="ts">
	import '../../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Zaur - Project</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<style>
		body {
			margin: 0;
			padding: 0;
			height: 100vh;
			overflow: hidden;
		}
	</style>
</svelte:head>

{@render children()} 