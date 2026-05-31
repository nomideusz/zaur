<script lang="ts">
	let {
		title,
		description,
		children,
		footer
	}: {
		title: string;
		description: string;
		children: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	} = $props();
</script>

<div class="z-settings-panel w-full min-w-0 max-w-full">
	<div class="z-settings-stack">
		{@render children()}
	</div>

	{#if footer}
		<footer class="z-settings-panel-footer">
			{@render footer()}
		</footer>
	{/if}
</div>
