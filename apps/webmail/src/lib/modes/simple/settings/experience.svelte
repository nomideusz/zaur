<script lang="ts">
	import type { MailViewMode } from '$lib/mail/view-mode';
	import { mailViewModeSwitchMessage } from '$lib/mail/switch-mode';
	import { WEBMAIL_MODE_LIST } from '$lib/modes/registry';
	import { settings } from '$lib/stores/settings.svelte';

	function requestSwitch(mode: MailViewMode) {
		if (mode === settings.mailViewMode) return;
		if (!confirm(mailViewModeSwitchMessage(mode))) return;
		settings.switchMailViewModeTo(mode);
	}
</script>

<ol class="z-settings-mode-picker" aria-label="Webmail experience">
	{#each WEBMAIL_MODE_LIST as mode (mode.id)}
		{@const isCurrent = settings.mailViewMode === mode.id}
		<li>
			{#if isCurrent}
				<div class="z-settings-mode-picker__current" aria-current="true">
					<span class="z-settings-mode-picker__label">{mode.label}</span>
					<span class="z-settings-mode-picker__meta">{mode.tagline} · current</span>
				</div>
			{:else}
				<button
					type="button"
					class="z-settings-mode-picker__option"
					onclick={() => requestSwitch(mode.id)}
				>
					<span class="z-settings-mode-picker__label">Switch to {mode.label}</span>
					<span class="z-settings-mode-picker__meta">{mode.tagline}</span>
				</button>
			{/if}
		</li>
	{/each}
</ol>
