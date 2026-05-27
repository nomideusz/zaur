<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import SettingsSidebar from '$lib/components/settings/SettingsSidebar.svelte';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/settings/nav';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	let { children } = $props();

	const links = $derived(settingsNavLinks());
	const isSettingsIndex = $derived($page.url.pathname === '/settings');
	const showMobileContent = $derived(!isSettingsIndex);

	const activeLink = $derived(
		links.find((link) => isSettingsNavActive($page.url.pathname, link.href)) ?? null
	);

	$effect(() => {
		if (!browser || !isSettingsIndex) return;
		if (window.matchMedia('(min-width: 768px)').matches) {
			goto('/settings/account', { replaceState: true });
		}
	});
</script>

<div class="flex min-h-0 flex-1 flex-row overflow-hidden">
	<SettingsSidebar />

	<div class="z-mail-pane flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		{#if showMobileContent}
			<header
				class={cn(
					'z-panel shrink-0 border-b border-border px-3 py-2.5 md:hidden',
					settings.compactSettingsLayout && 'py-2'
				)}
			>
				<a
					href="/settings"
					class="mb-2 inline-flex min-h-9 items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
				>
					<ArrowLeft class="size-4" aria-hidden="true" />
					Settings
				</a>
				<h2 class="text-base font-semibold text-fg">{activeLink?.label ?? 'Settings'}</h2>
			</header>
		{/if}

		<div class="z-pane-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
			<div
				class={cn(
					'w-full min-w-0',
					settings.compactSettingsLayout
						? 'px-4 py-4 pb-[max(2rem,env(safe-area-inset-bottom))]'
						: 'px-5 py-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-6 md:py-7'
				)}
			>
				{@render children()}
			</div>
		</div>
	</div>
</div>
