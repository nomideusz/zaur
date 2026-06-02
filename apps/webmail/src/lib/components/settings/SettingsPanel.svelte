<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<div class="z-settings-panel w-full min-w-0 max-w-full">
	<div class="z-settings-list">
		{@render children()}
	</div>
</div>
