<script lang="ts">
	import ProjectFrame from '$lib/components/ProjectFrame.svelte';
	import RedirectPage from '$lib/components/RedirectPage.svelte';
	
	export let data;
	const app = data.app;
</script>

{#if app.supportsIframe}
	<ProjectFrame title={app.name} url={app.url} />
{:else}
	<RedirectPage title={app.name} url={app.url} icon={app.icon} seconds={3} />
{/if} 