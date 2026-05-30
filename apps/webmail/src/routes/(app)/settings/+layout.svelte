<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import SettingsSidebar from '$lib/components/settings/SettingsSidebar.svelte';
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

	function navigateToSection(event: Event) {
		const href = (event.currentTarget as HTMLSelectElement).value;
		if (href && href !== $page.url.pathname) {
			void goto(href);
		}
	}

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
			<header class="z-settings-mobile-header z-panel shrink-0 border-b border-border md:hidden">
				<div class="flex items-center gap-2 px-3 py-2">
					<a
						href="/settings"
						class="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
						aria-label="All settings"
					>
						<ArrowLeft class="size-5" aria-hidden="true" />
					</a>
					<label class="min-w-0 flex-1">
						<span class="sr-only">Settings section</span>
						<select
							class="z-input w-full py-2 text-base"
							value={activeLink?.href ?? $page.url.pathname}
							onchange={navigateToSection}
						>
							{#each links as link (link.href)}
								<option value={link.href}>{link.label}</option>
							{/each}
						</select>
					</label>
				</div>
			</header>
		{/if}

		<div class="z-pane-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
			<div
				class={cn(
					'w-full min-w-0',
					settings.compactSettingsLayout
						? 'px-4 py-4 pb-[max(2rem,env(safe-area-inset-bottom))]'
						: 'px-4 py-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-6 md:py-7'
				)}
			>
				{@render children()}
			</div>
		</div>
	</div>
</div>
