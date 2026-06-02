<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import { settings } from '$lib/stores/settings.svelte';

	const sectionLinks = $derived(settingsNavLinks());
	const mailHref = $derived(settings.preferredMailHref());
	const currentSection = $derived(
		sectionLinks.find((link) => isSettingsNavActive($page.url.pathname, link.href))
	);
	const currentSectionLabel = $derived(currentSection?.label ?? 'Settings');
	const otherSections = $derived(
		sectionLinks.filter((link) => !isSettingsNavActive($page.url.pathname, link.href))
	);

	function openSection(href: string) {
		void goto(href);
	}
</script>

<header
	class="z-mail-text-nav z-mail-text-nav--settings z-settings-sticky-nav shrink-0"
	aria-label="Settings"
>
	<div class="z-mail-text-nav__row z-settings-nav-bar">
		<div class="z-settings-nav-bar__lead">
			<a class="z-mail-text-nav__link" href={mailHref}>Back to mail</a>
		</div>

		<p class="z-mail-text-nav__title z-settings-nav-bar__title">{currentSectionLabel}</p>

		<div class="z-mail-text-nav__links z-settings-nav-bar__links">
			<OverflowMenu
				label="Settings sections"
				menuId="settings-sections-menu"
				placement="bottom"
				triggerText="Sections"
				textTrigger
				triggerClass="z-mail-text-nav__link"
				menuClass="z-overflow-menu--list"
			>
				<div class="z-overflow-menu-scroll">
					{#each otherSections as link (link.href)}
						<OverflowMenuItem label={link.label} onclick={() => openSection(link.href)} />
					{/each}
				</div>
			</OverflowMenu>
		</div>
	</div>

	<div class="z-mail-text-nav__search z-settings-nav-bar__search">
		<SettingsSearch />
	</div>
</header>
