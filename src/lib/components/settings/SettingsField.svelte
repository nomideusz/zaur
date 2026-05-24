<script lang="ts">
	let {
		title,
		description,
		children
	}: {
		title: string;
		description?: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

<label class="block">
	<span class="text-sm font-medium text-fg">{title}</span>
	{#if description}
		<p class="mt-0.5 text-xs text-fg-muted">{description}</p>
	{/if}
	<div class="mt-2">
		{@render children()}
	</div>
</label>
