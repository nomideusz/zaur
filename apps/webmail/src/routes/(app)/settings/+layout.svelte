<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import MobilePicker from '$lib/components/ui/MobilePicker.svelte';
	import SettingsSidebar from '$lib/components/settings/SettingsSidebar.svelte';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/settings/nav';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';
	import { webmailModeDefinition } from '$lib/modes/registry';

	let { children } = $props();

	const activeMode = $derived(webmailModeDefinition(settings.mailViewMode));
	const links = $derived(settingsNavLinks(activeMode.id));
	const isSettingsIndex = $derived($page.url.pathname === '/settings');
	const showMobileContent = $derived(!isSettingsIndex);

	const activeLink = $derived(
		links.find((link) => isSettingsNavActive($page.url.pathname, link.href)) ?? null
	);
	const mobileSectionOptions = $derived(
		links.map((link) => ({ value: link.href, label: link.label }))
	);

	function navigateToSection(href: string) {
		if (href && href !== $page.url.pathname) {
			void goto(href);
		}
	}

</script>

<div
	class="flex min-h-0 flex-1 flex-row overflow-hidden"
	class:z-settings-mode-simple={activeMode.id === 'simple'}
	class:z-settings-mode-classic={activeMode.id === 'traditional'}
>
	<SettingsSidebar />

	<div class="z-mail-pane flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		{#if showMobileContent}
			<header class="z-settings-mobile-header z-panel shrink-0 border-b border-border md:hidden">
				<div class="flex items-center gap-2 px-3 py-2">
					<a
						href="/settings"
						class="inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
						aria-label="All settings"
					>
						<ArrowLeft class="size-5" aria-hidden="true" />
					</a>
					<MobilePicker
						label="Settings section"
						value={activeLink?.href ?? $page.url.pathname}
						options={mobileSectionOptions}
						onchange={navigateToSection}
					/>
				</div>
			</header>
		{/if}

		<div class="z-pane-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
			<div
				class={cn(
					'z-settings-content w-full min-w-0',
					settings.compactSettingsLayout
						? 'px-4 py-4 pb-[max(2rem,env(safe-area-inset-bottom))]'
						: 'px-4 py-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-6 md:py-7 lg:px-8 xl:px-10'
				)}
			>
				{@render children()}
			</div>
		</div>
	</div>
</div>
