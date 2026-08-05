<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { Drawer } from '@ark-ui/svelte/drawer';
	import { Portal } from '@ark-ui/svelte/portal';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import NavDrawerHeader from '$lib/components/shell/NavDrawerHeader.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	afterNavigate(() => {
		mobileIsland.closeNavDrawer();
	});
</script>

<Drawer.Root
	open={mobileIsland.navDrawerOpen}
	onOpenChange={(details) => {
		mobileIsland.navDrawerOpen = details.open;
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
				<Drawer.Title class="sr-only">Navigation</Drawer.Title>
				<NavDrawerHeader />
				<MailboxSidebar
					variant="drawer"
					embedded
					class="flex min-h-0 flex-1 border-t border-border/80"
				/>
			</Drawer.Content>
		</Drawer.Positioner>
	</Portal>
</Drawer.Root>
