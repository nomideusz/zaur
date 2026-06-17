<script lang="ts">
	import { page } from '$app/stores';
	import MobileSettingsShellNav from '$lib/components/shell/MobileSettingsShellNav.svelte';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { SETTINGS_NAV_ICON_MAP } from '$lib/components/settings/settings-nav-icons';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import { settingsShellClass } from '$lib/mail/layout';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	let {
		children,
		settingsRootClass
	}: {
		children: Snippet;
		settingsRootClass: string;
	} = $props();

	const sectionLinks = $derived(settingsNavLinks());
	const pathname = $derived($page.url.pathname);
</script>

<div class="z-settings-page {settingsRootClass} flex min-h-0 flex-1 flex-row overflow-hidden bg-surface">
	<!-- Desktop sidebar -->
	<aside
		class="z-mail-pane-surface hidden min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-visible border-r border-border z-10 md:flex"
		style="view-transition-name: settings-sidebar;"
		aria-label="Settings navigation"
	>
		<div class="shrink-0 border-b border-border/80 px-4 py-3">
			<h2 class="z-type-label">Settings</h2>
		</div>
		<div class="px-3 pt-3 pb-2 shrink-0">
			<SettingsSearch />
		</div>

		<ScrollArea class="min-h-0 flex-1">
			<nav class="p-2.5">
			<ul class="space-y-0.5">
				{#each sectionLinks as link (link.href)}
					{@const isActive = isSettingsNavActive(pathname, link.href)}
					{@const Icon = SETTINGS_NAV_ICON_MAP[link.icon]}
					<li>
						<a
							href={link.href}
							class={cn(
								'flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors',
								isActive
									? 'z-surface-active font-semibold text-fg'
									: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
							)}
							aria-current={isActive ? 'page' : undefined}
						>
							<Icon class="size-4 shrink-0 opacity-75" aria-hidden="true" />
							<span class="truncate">{link.label}</span>
						</a>
					</li>
			{/each}
		</ul>
			</nav>
		</ScrollArea>
</aside>

	<!-- Main content -->
	<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<div
			class="z-settings-mobile-toolbar flex shrink-0 flex-col gap-2 border-b border-border/80 py-2.5 md:hidden"
		>
			<MobileSettingsShellNav />
			<SettingsSearch />
		</div>
		<ScrollArea pane class="min-h-0 flex-1">
			<div class={cn(settingsShellClass(), 'flex min-h-full flex-col')}>
				<div class="z-settings-content flex-1">
					<div class="z-settings-body">
						{@render children()}
					</div>
				</div>
			</div>
		</ScrollArea>
	</div>
</div>
