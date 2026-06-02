<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		title,
		titleHref = null,
		titleBrand = false,
		actionHref = null,
		actionLabel = null,
		showBackToMail = false,
		backHref = null,
		showSettings = true,
		subtitle = null
	}: {
		title: string;
		titleHref?: string | null;
		titleBrand?: boolean;
		actionHref?: string | null;
		actionLabel?: string | null;
		showBackToMail?: boolean;
		backHref?: string | null;
		showSettings?: boolean;
		subtitle?: string | null;
	} = $props();

	const mailHomeHref = $derived(backHref ?? settings.preferredMailHref());
</script>

<div class="z-mail-text-nav z-mail-text-nav--list shrink-0">
	<div class="z-mail-text-nav__row z-mail-list-nav-bar">
		{#if showBackToMail}
			<div class="z-mail-list-nav-bar__lead">
				<a class="z-mail-text-nav__link" href={mailHomeHref}>Back to mail</a>
			</div>
		{/if}

		<div
			class={cn(
				'z-mail-list-nav-bar__title-wrap min-w-0',
				showBackToMail && 'z-mail-list-nav-bar__title-wrap--folder'
			)}
		>
			<p class={cn('z-mail-text-nav__title', titleBrand && 'z-type-brand')}>
				{#if titleHref}
					<a href={titleHref}>{title}</a>
				{:else}
					{title}
				{/if}
			</p>
		</div>

		<div class="z-mail-text-nav__links z-mail-list-nav-bar__links">
			{#if showSettings && !showBackToMail}
				<a class="z-mail-text-nav__link" href="/settings">Settings</a>
			{/if}
			{#if actionHref && actionLabel}
				<a class="z-mail-text-nav__action" href={actionHref}>{actionLabel}</a>
			{/if}
		</div>
	</div>
	{#if subtitle}
		<p class="z-mail-text-nav__label">{subtitle}</p>
	{/if}
</div>
