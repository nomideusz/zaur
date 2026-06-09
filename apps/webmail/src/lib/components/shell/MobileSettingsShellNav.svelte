<script lang="ts">
	import { page } from '$app/stores';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	const navLinks = $derived(settingsNavLinks('mobile'));
	const pathname = $derived($page.url.pathname);
	const backHref = $derived(settings.preferredMailHref());

	function navLinkClass(active: boolean): string {
		return cn('z-mail-text-nav__link shrink-0', active && 'z-mail-text-nav__link--active');
	}
</script>

<nav
	class="flex w-full min-w-0 items-center justify-between gap-3 md:hidden"
	aria-label="Settings navigation"
>
	<a href={backHref} class="z-mail-text-nav__link shrink-0">
		Back
	</a>

	<div class="flex min-w-0 items-center justify-end gap-3">
		{#each navLinks as link (link.href)}
			{@const isActive = isSettingsNavActive(pathname, link.href)}
			<a
				href={link.href}
				class={navLinkClass(isActive)}
				aria-current={isActive ? 'page' : undefined}
			>
				{link.label}
			</a>
		{/each}
	</div>
</nav>
