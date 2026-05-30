<script lang="ts">
	import { page } from '$app/stores';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/modes/registry';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let { isIndex = false }: { isIndex?: boolean } = $props();

	const links = $derived(settingsNavLinks('simple'));
	const activeLink = $derived(
		links.find((link) => isSettingsNavActive($page.url.pathname, link.href)) ?? null
	);
	const mailHref = $derived(settings.preferredMailHref());
</script>

<header class="z-settings-text-nav shrink-0">
	<h1 class="z-settings-text-nav__title">ZAUR Settings</h1>
	<div class="z-settings-text-nav__links">
		<a
			class={cn('z-settings-text-nav__link', isIndex && 'z-settings-text-nav__link--active')}
			href="/settings"
			aria-current={isIndex ? 'page' : undefined}
		>
			Experience
		</a>
		<a
			class={cn(
				'z-settings-text-nav__link',
				$page.url.pathname.startsWith('/mail') && 'z-settings-text-nav__link--active'
			)}
			href={mailHref}
		>
			Mail
		</a>
		{#if !isIndex && activeLink && activeLink.href !== '/settings'}
			<span class="z-settings-text-nav__sep" aria-hidden="true">·</span>
			<span class="z-settings-text-nav__current">{activeLink.label}</span>
		{/if}
	</div>
	{#if isIndex}
		<div class="z-settings-text-nav__search">
			<SettingsSearch />
		</div>
	{/if}
</header>
