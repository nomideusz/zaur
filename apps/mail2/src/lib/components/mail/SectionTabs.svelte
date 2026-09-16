<script lang="ts">
	import { page } from '$app/state';

	/**
	 * The shell's sections. One segmented control, drawn the same wherever it
	 * appears; the current section is read from the URL, not passed in, so a
	 * page cannot claim to be one it is not.
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

<nav
	class="flex items-center rounded-[6px] border border-[#cbd5e1] bg-white p-0.5 shadow-2xs {className}"
	aria-label="Sections"
>
	{#each sections as section (section.href)}
		<a
			href={section.href}
			aria-current={current?.href === section.href ? 'page' : undefined}
			data-sveltekit-preload-data="hover"
			class="flex h-[26px] items-center rounded-[4px] px-2.5 text-[12px] transition-colors {current?.href ===
			section.href
				? 'bg-slate-100 font-semibold text-slate-900'
				: 'font-medium text-slate-500 hover:text-slate-900'}"
		>
			{section.label}
		</a>
	{/each}
</nav>
