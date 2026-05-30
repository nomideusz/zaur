<script lang="ts">
	import type { MailViewMode } from '$lib/mail/view-mode';
	import { mailViewModeSwitchMessage } from '$lib/mail/switch-mode';
	import { WEBMAIL_MODE_LIST } from '$lib/modes/registry';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	function requestSwitch(mode: MailViewMode) {
		if (mode === settings.mailViewMode) return;
		if (!confirm(mailViewModeSwitchMessage(mode))) return;
		settings.switchMailViewModeTo(mode);
	}
</script>

<div class="grid gap-4 sm:grid-cols-2" aria-label="Webmail experience">
	{#each WEBMAIL_MODE_LIST as mode (mode.id)}
		{@const isCurrent = settings.mailViewMode === mode.id}
		<button
			type="button"
			class={cn('z-experience-card', isCurrent && 'z-experience-card--active')}
			disabled={isCurrent}
			aria-current={isCurrent ? 'true' : undefined}
			onclick={() => requestSwitch(mode.id)}
		>
			<span class="z-experience-card__label">{mode.label}</span>
			<span class="z-experience-card__tagline">
				{isCurrent ? `${mode.tagline} · current` : `Switch to ${mode.label}`}
			</span>
		</button>
	{/each}
</div>

<style>
	.z-experience-card {
		display: flex;
		min-height: 12rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: 1px solid var(--z-border);
		border-radius: 0;
		background: var(--z-surface);
		padding: 1rem;
		text-align: center;
		transition:
			background-color 150ms ease,
			border-color 150ms ease;
	}

	.z-experience-card:disabled {
		cursor: default;
	}

	.z-experience-card:not(:disabled):hover,
	.z-experience-card:not(:disabled):focus-visible {
		border-color: var(--z-border-strong);
		background: var(--z-surface-raised);
		outline: none;
	}

	.z-experience-card__label {
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.2;
		color: var(--z-fg);
	}

	.z-experience-card__tagline {
		font-size: 0.875rem;
		line-height: 1.4;
		color: var(--z-fg-muted);
	}

	.z-experience-card--active {
		border-color: var(--z-accent);
		background: color-mix(in srgb, var(--z-accent) 7%, var(--z-surface));
	}
</style>
