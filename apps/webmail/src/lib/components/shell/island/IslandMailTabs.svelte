<script lang="ts">
	import { page } from '$app/stores';
	import Menu from '$lib/components/icons/Menu.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText,
		SegmentGroupScroll
	} from '$lib/components/ui/segment-group';
	import { LABEL_UNSEEN } from '$lib/mail/new-mail';
	import {
		INBOX_MAILBOX_ROUTE_ID,
		MAIL_ROUTE_SEGMENTS,
		mailListHref,
		parseMailContext
	} from '$lib/mail/routes';
	import {
		ISLAND_RAIL_ITEM_CLASS,
		MOBILE_RAIL_GROUP_CLASS,
		MOBILE_RAIL_INDICATOR_CLASS
	} from '$lib/shell/mobile-rail';
	import { mail } from '$lib/stores/mail.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	const pathname = $derived($page.url.pathname);
	const mailCtx = $derived(parseMailContext(pathname));
	const mailRouteId = $derived(
		mailCtx?.kind === 'mailbox' ? (mailCtx.mailboxRouteId ?? INBOX_MAILBOX_ROUTE_ID) : null
	);
	const unseenFilterActive = $derived($page.url.searchParams.get('filter') === 'unseen');

	const inboxHref = $derived(mailListHref(INBOX_MAILBOX_ROUTE_ID));
	const unseenHref = $derived(`${inboxHref}?filter=unseen`);
	const importantHref = $derived(mailListHref(MAIL_ROUTE_SEGMENTS.important));

	/** Drawer/system/custom folders — show a non-link label between All and Important. */
	const folderContextRouteId = $derived.by(() => {
		if (!mailRouteId) return null;
		if (mailRouteId === INBOX_MAILBOX_ROUTE_ID) return null;
		if (mailRouteId === MAIL_ROUTE_SEGMENTS.important) return null;
		return mailRouteId;
	});

	const folderContextLabel = $derived(
		folderContextRouteId ? (mail.mailboxByRouteId(folderContextRouteId)?.name ?? 'Folder') : null
	);

	const activeSegment = $derived.by(() => {
		if (!mailRouteId) return undefined;
		if (folderContextRouteId) return folderContextRouteId;
		if (unseenFilterActive) return 'unseen';
		if (mailRouteId === MAIL_ROUTE_SEGMENTS.important) return 'important';
		return 'all';
	});
</script>

<div class="z-mobile-island__tabs">
	<button
		type="button"
		class="z-mobile-island__icon-btn"
		aria-label="Apps and folders"
		aria-expanded={mobileIsland.navDrawerOpen}
		onclick={() => mobileIsland.openNavDrawer()}
	>
		<Menu class="size-[1.125rem]" aria-hidden="true" />
	</button>

	<nav class="min-w-0 flex-1" aria-label="Mail views">
		<SegmentGroupScroll activeValue={activeSegment} class="w-full">
			<SegmentGroup
				value={activeSegment}
				track={false}
				indicatorClass={MOBILE_RAIL_INDICATOR_CLASS}
				class={MOBILE_RAIL_GROUP_CLASS}
			>
				<SegmentGroupItem value="unseen" href={unseenHref} class={ISLAND_RAIL_ITEM_CLASS}>
					<SegmentGroupItemText>{LABEL_UNSEEN}</SegmentGroupItemText>
				</SegmentGroupItem>
				<SegmentGroupItem value="all" href={inboxHref} class={ISLAND_RAIL_ITEM_CLASS}>
					<SegmentGroupItemText>All</SegmentGroupItemText>
				</SegmentGroupItem>
				{#if folderContextRouteId && folderContextLabel}
					<SegmentGroupItem
						value={folderContextRouteId}
						static
						class={ISLAND_RAIL_ITEM_CLASS}
					>
						<SegmentGroupItemText>{folderContextLabel}</SegmentGroupItemText>
					</SegmentGroupItem>
				{/if}
				<SegmentGroupItem value="important" href={importantHref} class={ISLAND_RAIL_ITEM_CLASS}>
					<SegmentGroupItemText>Highlights</SegmentGroupItemText>
				</SegmentGroupItem>
			</SegmentGroup>
		</SegmentGroupScroll>
	</nav>

	<a
		href="/mail/compose"
		class="z-mobile-island__icon-btn z-mobile-island__icon-btn--accent"
		aria-label="New message"
	>
		<PenSquare class="size-[1.125rem]" aria-hidden="true" />
	</a>
</div>
