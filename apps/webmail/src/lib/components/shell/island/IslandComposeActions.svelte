<script lang="ts">
	import Paperclip from '$lib/components/icons/Paperclip.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	const ctx = $derived(mobileIsland.compose);
</script>

<!-- Back (save draft) lives in the top bar; the island keeps the actions. -->
{#if ctx}
	<div class="z-mobile-island__compose" role="toolbar" aria-label="Compose actions">
		<button
			type="button"
			class="z-mobile-island__icon-btn"
			aria-label="Attach file"
			onclick={ctx.onAttach}
		>
			<Paperclip class="size-[1.125rem]" aria-hidden="true" />
		</button>

		<div class="min-w-0 flex-1" aria-hidden="true"></div>

		{#if !ctx.isEmpty}
			<button
				type="button"
				class="z-mail-text-nav__link z-mail-text-nav__link--danger shrink-0"
				onclick={ctx.onDiscard}
			>
				Discard
			</button>
		{/if}
		<button
			type="button"
			class="z-mail-text-nav__action z-mail-text-nav__action--pill shrink-0"
			disabled={ctx.sendDisabled}
			onclick={ctx.onSend}
		>
			{ctx.sendLabel}
		</button>
	</div>
{/if}
