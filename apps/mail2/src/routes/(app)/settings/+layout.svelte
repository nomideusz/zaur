<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import SectionShell from '#lib/components/mail/SectionShell.svelte';

	let { children }: { children: Snippet } = $props();

	const tabs = [
		{ href: '/settings', label: 'General' },
		{ href: '/settings/security', label: 'Security' }
	] as const;

	const current = $derived(
		tabs.find((tab) => page.url.pathname === tab.href) ??
			tabs.find((tab) => tab.href !== '/settings' && page.url.pathname.startsWith(tab.href)) ??
			tabs[0]
	);
</script>

<SectionShell title="Settings">
	{#snippet controls()}
		<!-- Settings' own pages, in the slot Calendar puts its views in. -->
		<nav class="z-group shrink-0" aria-label="Settings sections">
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={current.href === tab.href ? 'page' : undefined}
					data-sveltekit-preload-data="hover"
					class="z-segment"
				>
					{tab.label}
				</a>
			{/each}
		</nav>
	{/snippet}

	<!-- Settings sit on the pane ground; each card is a white surface on it. -->
	<div class="min-h-0 flex-1 overflow-y-auto bg-[var(--z-canvas)] px-6 py-6 max-md:px-4 max-md:py-4">
		<div class="mx-auto flex max-w-[640px] flex-col gap-4">
			{@render children()}
		</div>
	</div>
</SectionShell>
