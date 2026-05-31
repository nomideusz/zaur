<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';

	let {
		title,
		titleHref = null,
		actionHref = null,
		actionLabel = null,
		jumpHref = null,
		jumpLabel = null,
		showBackToMail = false,
		backHref = null,
		showSettings = true,
		subtitle = null
	}: {
		title: string;
		titleHref?: string | null;
		actionHref?: string | null;
		actionLabel?: string | null;
		jumpHref?: string | null;
		jumpLabel?: string | null;
		showBackToMail?: boolean;
		backHref?: string | null;
		showSettings?: boolean;
		subtitle?: string | null;
	} = $props();

	const mailHomeHref = $derived(backHref ?? settings.preferredMailHref());
</script>

<div class="z-mail-text-nav">
	<div class="z-mail-text-nav__row">
		<h1 class="z-mail-text-nav__title">
			{#if titleHref}
				<a href={titleHref}>{title}</a>
			{:else}
				{title}
			{/if}
		</h1>
		{#if actionHref && actionLabel}
			<a class="z-mail-text-nav__action" href={actionHref}>{actionLabel}</a>
		{/if}
	</div>
	{#if subtitle}
		<p class="z-mail-text-nav__label">{subtitle}</p>
	{/if}
	<div class="z-mail-text-nav__links">
		{#if jumpHref && jumpLabel}
			<a class="z-mail-text-nav__link" href={jumpHref}>{jumpLabel}</a>
		{/if}
		{#if showBackToMail}
			<a class="z-mail-text-nav__link" href={mailHomeHref}>Back to mail</a>
		{/if}
		{#if showSettings}
			<a class="z-mail-text-nav__link" href="/settings">Settings</a>
		{/if}
	</div>
</div>
