<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { Drawer } from '@ark-ui/svelte/drawer';
	import { Portal } from '@ark-ui/svelte/portal';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	afterNavigate(() => {
		mobileIsland.closeMailboxDrawer();
	});
</script>

<Drawer.Root
	open={mobileIsland.mailboxDrawerOpen}
	onOpenChange={(details) => {
		mobileIsland.mailboxDrawerOpen = details.open;
	}}
	swipeDirection="start"
	lazyMount
	unmountOnExit
>
	<Portal>
		<Drawer.Backdrop class="z-mailbox-drawer-backdrop fixed inset-0 bg-black/50 md:hidden" />
		<Drawer.Positioner class="z-mailbox-drawer-positioner fixed inset-0 flex items-stretch justify-start md:hidden">
			<Drawer.Content
				class="z-mail-view z-mailbox-drawer-content flex h-dvh max-h-dvh w-[min(85vw,var(--width-sidebar))] max-w-sm flex-col border-r border-border bg-surface-raised shadow-xl outline-none"
				draggable={false}
			>
				<Drawer.Title class="sr-only">Mailboxes</Drawer.Title>
				<MailboxSidebar
					variant="drawer"
					class="flex min-h-0 flex-1"
					onClose={() => mobileIsland.closeMailboxDrawer()}
				/>
			</Drawer.Content>
		</Drawer.Positioner>
	</Portal>
</Drawer.Root>
