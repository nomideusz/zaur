<script lang="ts">
	let {
		title,
		children
	}: {
		title: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

<section class="space-y-4">
	<h3 class="text-xs font-medium tracking-wide text-fg-subtle uppercase">{title}</h3>
	<div class="space-y-4">
		{@render children()}
	</div>
</section>
