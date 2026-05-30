<script lang="ts">
	import { page } from '$app/stores';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/modes/registry';
	import { cn } from '$lib/utils/cn';

	const links = $derived(settingsNavLinks('simple').filter((link) => link.href !== '/settings'));
</script>

<nav class="z-settings-hub" aria-label="Settings sections">
	<ol class="z-settings-hub-list">
		{#each links as link (link.href)}
			{@const active = isSettingsNavActive($page.url.pathname, link.href)}
			<li>
				<a
					href={link.href}
					class={cn('z-settings-hub-link', active && 'z-settings-hub-link--active')}
					aria-current={active ? 'page' : undefined}
				>
					{link.label}
				</a>
			</li>
		{/each}
	</ol>
</nav>
