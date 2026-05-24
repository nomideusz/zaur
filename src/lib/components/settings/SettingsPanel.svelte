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

<div class="z-panel rounded-xl p-6">
	<h2 class="text-lg font-semibold text-fg">{title}</h2>
	<p class="mt-1 text-sm text-fg-muted">{description}</p>
	<div class="mt-6 space-y-4">
		{@render children()}
	</div>
	{#if footer}
		<div class="mt-8 border-t border-border pt-6">
			{@render footer()}
		</div>
	{/if}
</div>
