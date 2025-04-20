<script lang="ts">
	import ProjectFrame from '$lib/components/ProjectFrame.svelte';
	import { onMount } from 'svelte';
	
	export let data;
	const app = data.app;

	onMount(() => {
		if (app.openInNewTab) {
			window.open(app.url, '_blank');
			window.history.back();
		}
	});
</script>

{#if app.openInNewTab}
	<RedirectPage title={app.name} url={app.url} icon={app.icon} seconds={0} />
{:else if app.supportsIframe}
	<ProjectFrame title={app.name} url={app.url} />
{:else}
	<RedirectPage title={app.name} url={app.url} icon={app.icon} seconds={3} />
{/if} 