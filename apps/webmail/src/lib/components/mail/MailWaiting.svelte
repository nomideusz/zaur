<script lang="ts">
	import ZaurSprite from '$lib/components/ui/ZaurSprite.svelte';

	let {
		label,
		hint = null,
		compact = false
	}: {
		label: string;
		hint?: string | null;
		compact?: boolean;
	} = $props();
</script>

<div
	class="z-mail-waiting"
	class:z-mail-waiting--compact={compact}
	role="status"
	aria-live="polite"
	aria-label={label}
>
	<div class="z-mail-waiting__sprite text-fg-subtle" aria-hidden="true">
		<ZaurSprite id="idle" scale={compact ? 3 : 4} blinks />
	</div>
	<p class="z-mail-waiting__label">{label}</p>
	{#if hint}
		<p class="z-mail-waiting__hint">{hint}</p>
	{/if}
</div>
