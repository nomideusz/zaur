<script lang="ts">
	import { page } from '$app/stores';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/modes/registry';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let { isIndex = false }: { isIndex?: boolean } = $props();

	const sectionLinks = $derived(
		settingsNavLinks('simple').filter((link) => link.href !== '/settings')
	);
	const mailHref = $derived(settings.preferredMailHref());
</script>

<header
	class="z-mail-text-nav z-mail-text-nav--settings z-settings-sticky-nav shrink-0"
	aria-label="Settings"
>
	<div class="z-settings-nav-back">
		<a class="z-mail-text-nav__link" href={mailHref}>Back to mail</a>
	</div>
	<nav class="z-settings-section-nav" aria-label="Settings sections">
		{#each sectionLinks as link (link.href)}
			{@const active = isSettingsNavActive($page.url.pathname, link.href)}
			<a
				href={link.href}
				class={cn('z-mail-text-nav__link', active && 'z-mail-text-nav__link--active')}
				aria-current={active ? 'page' : undefined}
			>
				{link.label}
			</a>
		{/each}
	</nav>
	{#if isIndex}
		<div class="z-mail-text-nav__search">
			<SettingsSearch />
		</div>
	{/if}
</header>
