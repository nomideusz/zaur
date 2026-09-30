<script module lang="ts">
	export const sections = [
		{ href: '/', label: 'Mail', match: (path: string) => path === '/' },
		{ href: '/contacts', label: 'Contacts', match: (path: string) => path.startsWith('/contacts') },
		{ href: '/calendar', label: 'Calendar', match: (path: string) => path.startsWith('/calendar') },
		{ href: '/files', label: 'Files', match: (path: string) => path.startsWith('/files') },
		{ href: '/settings', label: 'Settings', match: (path: string) => path.startsWith('/settings') }
	] as const;

	export { sectionIcon };
</script>

<script lang="ts">
	import { page } from '$app/state';

	/**
	 * The shell's sections. One segmented control, drawn the same wherever it
	 * appears; the current section is read from the URL, not passed in, so a
	 * page cannot claim to be one it is not. The active segment wears the
	 * correspondence fill — the same tint that marks the active filter and a
	 * selected row, because "the one you are on" is one idea in this shell.
	 * The phone's tab row imports this same list, and the same glyphs.
	 *
	 * Below 1100px the five words cost the section's own controls a third of
	 * the header, so the tabs give way first: each becomes its glyph, the one
	 * the phone's tab row already taught, and the word stays for screen readers
	 * and as the tooltip.
	 */

	let { class: className = '' }: { class?: string } = $props();

	const current = $derived(sections.find((section) => section.match(page.url.pathname)) ?? null);
</script>

{#snippet sectionIcon(href: string, className: string)}
	<svg class={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<g stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">
			{#if href === '/'}
				<path d="M2 4V12M14 4V12M2 4L8 8" stroke-opacity="0.4" />
				<path d="M2 4H14L2 12H14" />
			{:else if href === '/contacts'}
				<circle cx="8" cy="5.5" r="2.5" />
				<path d="M3.5 13.5c.6-2.4 2.3-3.5 4.5-3.5s3.9 1.1 4.5 3.5" />
			{:else if href === '/calendar'}
				<rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
				<path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
			{:else if href === '/files'}
				<path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" />
			{:else}
				<circle cx="8" cy="8" r="2" />
				<path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M3.8 12.2l1-1M11.2 4.8l1-1" />
			{/if}
		</g>
	</svg>
{/snippet}

<nav class="z-group {className}" aria-label="Sections">
	{#each sections as section (section.href)}
		<a
			href={section.href}
			aria-current={current?.href === section.href ? 'page' : undefined}
			data-sveltekit-preload-data="hover"
			title={section.label}
			class="z-segment max-[1099px]:!px-2"
		>
			{@render sectionIcon(section.href, 'size-4 min-[1100px]:hidden')}
			<span class="max-[1099px]:sr-only">{section.label}</span>
		</a>
	{/each}
</nav>
