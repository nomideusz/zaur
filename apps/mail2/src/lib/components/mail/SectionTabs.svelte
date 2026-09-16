<script lang="ts">
	import { page } from '$app/state';

	/**
	 * The shell's sections. One segmented control, drawn the same wherever it
	 * appears; the current section is read from the URL, not passed in, so a
	 * page cannot claim to be one it is not. The active segment wears the
	 * correspondence fill — the same tint that marks the active filter and a
	 * selected row, because "the one you are on" is one idea in this shell.
	 */
	const sections = [
		{ href: '/', label: 'Mail', match: (path: string) => path === '/' },
		{ href: '/contacts', label: 'Contacts', match: (path: string) => path.startsWith('/contacts') },
		{ href: '/calendar', label: 'Calendar', match: (path: string) => path.startsWith('/calendar') },
		{ href: '/settings', label: 'Settings', match: (path: string) => path.startsWith('/settings') }
	] as const;

	let { class: className = '' }: { class?: string } = $props();

	const current = $derived(sections.find((section) => section.match(page.url.pathname)) ?? null);
</script>

<nav class="z-group {className}" aria-label="Sections">
	{#each sections as section (section.href)}
		<a
			href={section.href}
			aria-current={current?.href === section.href ? 'page' : undefined}
			data-sveltekit-preload-data="hover"
			class="z-segment"
		>
			{section.label}
		</a>
	{/each}
</nav>
