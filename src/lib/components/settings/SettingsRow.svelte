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

<label class="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
	<div>
		<p class="text-sm font-medium text-fg">{title}</p>
		{#if description}
			<p class="text-xs text-fg-muted">{description}</p>
		{/if}
	</div>
	{@render children()}
</label>
