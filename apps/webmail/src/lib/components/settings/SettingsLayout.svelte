<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import AppSidebarShortcuts from '$lib/components/shell/AppSidebarShortcuts.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import MobilePicker from '$lib/components/ui/MobilePicker.svelte';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import { settings } from '$lib/stores/settings.svelte';
	import { settingsShellClass } from '$lib/mail/layout';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	import User from '$lib/components/icons/User.svelte';
	import MailOpen from '$lib/components/icons/MailOpen.svelte';
	import PencilLine from '$lib/components/icons/PencilLine.svelte';
	import Palette from '$lib/components/icons/Palette.svelte';
	import Database from '$lib/components/icons/Database.svelte';

	let {
		children,
		settingsRootClass
	}: {
		children: Snippet;
		settingsRootClass: string;
	} = $props();

	const sectionLinks = $derived(settingsNavLinks());
	const mailHref = $derived(settings.preferredMailHref());
	const pathname = $derived($page.url.pathname);

	const settingsOptions = $derived(
		sectionLinks.map((link) => ({
			value: link.href,
			label: link.label
		}))
	);

	const iconMap = {
		account: User,
		reading: MailOpen,
		writing: PencilLine,
		appearance: Palette,
		data: Database
	};
</script>

<div class="z-settings-page {settingsRootClass} flex h-full w-full flex-row overflow-hidden bg-surface">
	<!-- Settings Sidebar Navigation (Desktop only) -->
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

		<nav class="z-pane-scroll min-h-0 flex-1 overflow-y-auto p-2.5">
			<ul class="space-y-0.5">
				{#each sectionLinks as link (link.href)}
					{@const isActive = isSettingsNavActive(pathname, link.href)}
					{@const Icon = iconMap[link.icon]}
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
							{#if Icon}
								<Icon class="size-4 shrink-0 opacity-75" aria-hidden="true" />
							{/if}
							<span class="truncate">{link.label}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<AppSidebarShortcuts inSettings={true} />
	</aside>

	<!-- Main Settings Content Area -->
	<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<!-- Mobile Header Navigation (Mobile only) -->
		<header
			class="z-mail-list-pane-header flex h-14 shrink-0 items-center justify-between overflow-hidden border-b border-border/80 px-4 gap-3 md:hidden animate-fade-in"
			aria-label="Mobile settings navigation"
		>
			<div class="flex items-center gap-2 min-w-0">
				<a
					href={mailHref}
					class="flex items-center text-accent hover:opacity-80 transition-opacity no-underline shrink-0"
					aria-label="Back to mail"
				>
					<ChevronLeft class="size-6" />
				</a>
				<MobilePicker
					label="Settings"
					value={pathname}
					options={settingsOptions}
					onchange={(val) => {
						goto(val);
					}}
					compact={true}
					class="w-44 flex-initial"
				/>
			</div>
		</header>

		<!-- Scrollable settings body -->
		<div class="z-pane-scroll min-h-0 flex-1 overflow-y-auto">
			<div class={cn(settingsShellClass(), 'flex flex-col')}>
				<div class="z-settings-content">
					<div class="z-settings-body pt-3 md:pt-0">
						{@render children()}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
