<script lang="ts">
	import { page } from '$app/stores';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import UserMenu from '$lib/components/shell/UserMenu.svelte';
	import MobilePicker from '$lib/components/ui/MobilePicker.svelte';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import { settings } from '$lib/stores/settings.svelte';
	import { goto } from '$app/navigation';

	const sectionLinks = $derived(settingsNavLinks());
	const pathname = $derived($page.url.pathname);
	const mailHref = $derived(settings.preferredMailHref());
	const isSettingsHome = $derived(/^\/settings\/?$/.test(pathname));

	const activeSection = $derived(
		sectionLinks.find((link) => isSettingsNavActive(pathname, link.href)) ?? sectionLinks[0]
	);

	const sectionOptions = $derived(
		sectionLinks.map((link) => ({ value: link.href, label: link.label }))
	);

	function onSectionChange(href: string) {
		if (href !== pathname) void goto(href);
	}
</script>

<header class="z-settings-mobile-header shrink-0 md:hidden" aria-label="Settings">
	<div class="z-settings-mobile-header__bar z-mail-list-pane-header flex h-14 items-center gap-2 px-4">
		<a
			href={isSettingsHome ? mailHref : '/settings'}
			class="z-icon-tap-target shrink-0 rounded-full text-accent"
			aria-label={isSettingsHome ? 'Back to mail' : 'All settings'}
		>
			<ChevronLeft class="size-5" aria-hidden="true" />
		</a>

		{#if isSettingsHome}
			<h1 class="z-settings-mobile-header__title min-w-0 flex-1 truncate">Settings</h1>
		{:else}
			<MobilePicker
				label="Settings section"
				value={activeSection?.href ?? '/settings/account'}
				options={sectionOptions}
				onchange={onSectionChange}
				compact={true}
				class="min-w-0 flex-1"
			/>
		{/if}

		<div class="shrink-0">
			<UserMenu compact />
		</div>
	</div>

	<div class="z-settings-mobile-header__search border-b border-border/80 px-4 py-2">
		<SettingsSearch />
	</div>
</header>
