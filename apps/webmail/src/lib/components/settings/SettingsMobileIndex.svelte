<script lang="ts">
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import { page } from '$app/stores';
	import { cn } from '$lib/utils/cn';

	const sectionLinks = $derived(settingsNavLinks('mobile'));
	const pathname = $derived($page.url.pathname);
</script>

<nav class="z-settings-mobile-index" aria-label="Settings sections">
	<p class="z-settings-section-title z-settings-mobile-index-heading">Settings</p>
	<ul class="z-settings-mobile-index-list">
		{#each sectionLinks as link (link.href)}
			{@const isActive = isSettingsNavActive(pathname, link.href)}
			<li>
				<a
					href={link.href}
					class={cn(
						'z-settings-mobile-index-link',
						isActive && 'z-settings-mobile-index-link--active'
					)}
					aria-current={isActive ? 'page' : undefined}
				>
					{link.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
