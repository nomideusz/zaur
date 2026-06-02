<script lang="ts">
	import { page } from '$app/stores';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import { settings } from '$lib/stores/settings.svelte';

	const sectionLinks = $derived(settingsNavLinks());
	const mailHref = $derived(settings.preferredMailHref());
	const pathname = $derived($page.url.pathname);
</script>

<header
	class="z-mail-text-nav z-mail-text-nav--settings z-settings-sticky-nav shrink-0"
	aria-label="Settings"
>
	<div class="z-mail-text-nav__row z-settings-nav-bar">
		<div class="z-settings-nav-bar__lead">
			<a class="z-mail-text-nav__link" href={mailHref}>Back to mail</a>
		</div>

		<nav class="z-mail-text-nav__links z-settings-nav-bar__links" aria-label="Settings sections">
			{#each sectionLinks as link (link.href)}
				{#if isSettingsNavActive(pathname, link.href)}
					<span class="z-mail-text-nav__link z-mail-text-nav__link--here" aria-current="page">
						{link.label}
					</span>
				{:else}
					<a class="z-mail-text-nav__link" href={link.href}>{link.label}</a>
				{/if}
			{/each}
		</nav>
	</div>

	<div class="z-mail-text-nav__search z-settings-nav-bar__search">
		<SettingsSearch />
	</div>
</header>
