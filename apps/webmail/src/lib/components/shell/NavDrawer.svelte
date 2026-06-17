<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { Drawer } from '@ark-ui/svelte/drawer';
	import { Portal } from '@ark-ui/svelte/portal';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import IslandAppNav from '$lib/components/shell/island/IslandAppNav.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	/** One snap — ~92% height; swipe down on the grabber (or sheet) to dismiss. */
	const snapPoints = [0.92];

	afterNavigate(() => {
		mobileIsland.closeNavDrawer();
	});
</script>

<Drawer.Root
	open={mobileIsland.navDrawerOpen}
	onOpenChange={(details) => {
		mobileIsland.navDrawerOpen = details.open;
	}}
	swipeDirection="down"
	{snapPoints}
	defaultSnapPoint={snapPoints[0]}
	lazyMount
	unmountOnExit
>
	<Portal>
		<Drawer.Backdrop class="z-mailbox-drawer-backdrop fixed inset-0 bg-black/50 md:hidden" />
		<Drawer.Positioner
			class="z-mailbox-drawer-positioner fixed inset-0 flex items-end justify-center md:hidden"
		>
			<Drawer.Content
				class="z-mail-view z-mailbox-drawer-content z-nav-drawer-content flex w-full max-w-lg flex-col bg-surface-raised outline-none"
			>
				<Drawer.Title class="sr-only">Navigation</Drawer.Title>
				<Drawer.Grabber class="z-mailbox-drawer-grabber">
					<Drawer.GrabberIndicator class="z-mailbox-drawer-grabber-indicator" />
				</Drawer.Grabber>
				<IslandAppNav />
				<MailboxSidebar
					variant="drawer"
					embedded
					class="flex min-h-0 flex-1 border-t border-border/80"
				/>
			</Drawer.Content>
		</Drawer.Positioner>
	</Portal>
</Drawer.Root>
