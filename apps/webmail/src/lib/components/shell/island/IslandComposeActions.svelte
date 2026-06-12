<script lang="ts">
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Paperclip from '$lib/components/icons/Paperclip.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	const ctx = $derived(mobileIsland.compose);
</script>

{#if ctx}
	<div class="z-mobile-island__compose" role="toolbar" aria-label="Compose actions">
		<button
			type="button"
			class="z-mobile-island__icon-btn"
			aria-label="Save draft and go back"
			onclick={ctx.onBack}
		>
			<ArrowLeft class="size-5" aria-hidden="true" />
		</button>
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
