<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { Drawer } from '@ark-ui/svelte/drawer';
	import { Portal } from '@ark-ui/svelte/portal';
	import CalendarSidebar from '$lib/components/calendar/CalendarSidebar.svelte';
	import FilesSidebar from '$lib/components/files/FilesSidebar.svelte';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import NavDrawerHeader from '$lib/components/shell/NavDrawerHeader.svelte';
	import { appNavItems } from '$lib/shell/app-nav';
	import { mobileShell } from '$lib/stores/mobile-shell.svelte';
	import { cn } from '$lib/utils/cn';

	afterNavigate(() => {
		mobileShell.closeNavDrawer();
	});

	const pathname = $derived(page.url.pathname);
	const onCalendar = $derived(pathname.startsWith('/calendar'));
	const onFiles = $derived(pathname.startsWith('/files'));
	const apps = $derived(appNavItems());
</script>

<Drawer.Root
	open={mobileShell.navDrawerOpen}
	onOpenChange={(details) => {
		mobileShell.navDrawerOpen = details.open;
	}}
	swipeDirection="start"
	lazyMount
	unmountOnExit
>
	<!-- Left-edge gesture strip — swipe in from the edge to open folder nav.
	     Starts below the top bar so it never shadows the hamburger button. -->
	<Drawer.SwipeArea
		class="fixed bottom-0 left-0 z-40 w-4 md:hidden"
		style="top: var(--z-mobile-topbar-height)"
	/>
	<Portal>
		<Drawer.Backdrop class="z-mailbox-drawer-backdrop fixed inset-0 bg-black/50 md:hidden" />
		<Drawer.Positioner
			class="z-mailbox-drawer-positioner fixed inset-0 flex items-stretch justify-start md:hidden"
		>
			<Drawer.Content
				class="z-mail-view z-nav-drawer-content flex h-full flex-col bg-surface-raised outline-none"
			>
				<Drawer.Title class="sr-only">
					{onCalendar ? 'Calendars' : onFiles ? 'Files' : 'Navigation'}
				</Drawer.Title>
				<NavDrawerHeader />
				<nav class="z-nav-drawer__apps" aria-label="Apps">
					{#each apps as item (item.id)}
						{@const Icon = item.icon}
						{@const isActive = item.isActive(pathname)}
						<a
							href={item.href}
							class={cn('z-nav-drawer__app', isActive && 'z-nav-drawer__app--active')}
							aria-current={isActive ? 'page' : undefined}
						>
							<Icon class="size-5" aria-hidden="true" />
							<span>{item.label}</span>
						</a>
					{/each}
				</nav>
				{#if onCalendar}
					<CalendarSidebar
						variant="drawer"
						embedded
						class="flex min-h-0 flex-1 border-t border-border/80"
					/>
				{:else if onFiles}
					<FilesSidebar class="flex min-h-0 w-full flex-1 border-t border-border/80" />
				{:else}
					<MailboxSidebar
						variant="drawer"
						embedded
						class="flex min-h-0 flex-1 border-t border-border/80"
					/>
				{/if}
			</Drawer.Content>
		</Drawer.Positioner>
	</Portal>
</Drawer.Root>
