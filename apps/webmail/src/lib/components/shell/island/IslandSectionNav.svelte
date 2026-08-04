<script lang="ts">
	import { page } from '$app/stores';
	import Plus from '$lib/components/icons/Plus.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';

	/* Section label/nav lives in MobileTopBar; island keeps the primary action. */

	const pageAction = $derived(shellHeader.page?.primaryAction);
	const onContacts = $derived($page.url.pathname.startsWith('/contacts'));
</script>

<div class="z-mobile-island__tabs z-mobile-island__tabs--compose" data-testid="island-section-action">
	{#if onContacts && pageAction?.kind === 'button'}
		<button
			type="button"
			class="z-mobile-island__compose-pill"
			aria-label={pageAction.label}
			onclick={pageAction.onclick}
		>
			<Plus class="size-[1.125rem]" aria-hidden="true" />
			<span>{pageAction.label}</span>
		</button>
	{:else if onContacts && pageAction?.kind === 'link'}
		<a href={pageAction.href} class="z-mobile-island__compose-pill" aria-label={pageAction.label}>
			<Plus class="size-[1.125rem]" aria-hidden="true" />
			<span>{pageAction.label}</span>
		</a>
	{/if}
</div>
