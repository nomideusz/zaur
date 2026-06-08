<script lang="ts">
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import { SETTINGS_NAV_ICON_MAP } from '$lib/components/settings/settings-nav-icons';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import { page } from '$app/stores';
	import { cn } from '$lib/utils/cn';

	const sectionLinks = $derived(settingsNavLinks());
	const pathname = $derived($page.url.pathname);
</script>

<div class="z-settings-mobile-index">
	<div class="z-settings-mobile-index-head">
		<h1 class="z-settings-mobile-index-title">Settings</h1>
		<p class="z-settings-mobile-index-desc">Account, mail, and app preferences.</p>
	</div>

	<nav class="z-settings-mobile-index-nav" aria-label="Settings sections">
		<ul class="z-settings-mobile-index-list">
			{#each sectionLinks as link (link.href)}
				{@const isActive = isSettingsNavActive(pathname, link.href)}
				{@const Icon = SETTINGS_NAV_ICON_MAP[link.icon]}
				<li>
					<a
						href={link.href}
						class={cn(
							'z-settings-mobile-index-link',
							isActive && 'z-settings-mobile-index-link--active'
						)}
						aria-current={isActive ? 'page' : undefined}
					>
						<span class="z-settings-mobile-index-link__icon" aria-hidden="true">
							<Icon class="size-5" />
						</span>
						<span class="z-settings-mobile-index-link__label">{link.label}</span>
						<ChevronRight class="z-settings-mobile-index-link__chevron size-4" aria-hidden="true" />
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>
