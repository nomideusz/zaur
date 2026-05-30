<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
</script>

<div class="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Webmail experience">
	<button
		type="button"
		role="radio"
		aria-checked={settings.mailViewMode === 'simple'}
		class={cn('z-experience-card', settings.mailViewMode === 'simple' && 'z-experience-card--active')}
		onclick={() => settings.setMailViewMode('simple')}
	>
		Simple
	</button>

	<button
		type="button"
		role="radio"
		aria-checked={settings.mailViewMode === 'traditional'}
		class={cn(
			'z-experience-card',
			settings.mailViewMode === 'traditional' && 'z-experience-card--active'
		)}
		onclick={() => settings.setMailViewMode('traditional')}
	>
		Classic
	</button>
</div>

<style>
	.z-experience-card {
		display: flex;
		min-height: 12rem;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--z-border);
		border-radius: 1rem;
		background: var(--z-surface);
		padding: 1rem;
		text-align: center;
		font-size: clamp(1.75rem, 5vw, 2.75rem);
		font-weight: 650;
		line-height: 1;
		letter-spacing: -0.045em;
		color: var(--z-fg);
		transition:
			background-color 150ms ease,
			border-color 150ms ease;
	}

	.z-experience-card:hover,
	.z-experience-card:focus-visible {
		border-color: var(--z-border-strong);
		background: var(--z-surface-raised);
		outline: none;
	}

	.z-experience-card--active {
		border-color: var(--z-accent);
		background: color-mix(in srgb, var(--z-accent) 7%, var(--z-surface));
	}
</style>
