<script lang="ts">
	import { page } from '$app/stores';
	import LayoutGrid from '$lib/components/icons/LayoutGrid.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import FolderInput from '$lib/components/icons/FolderInput.svelte';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText,
		SegmentGroupScroll
	} from '$lib/components/ui/segment-group';
	import { MAILBOX_DISPLAY_NAMES } from '$lib/mail/mailboxes';
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

	const currentRouteId = $derived(mailRouteId ?? INBOX_MAILBOX_ROUTE_ID);
	const currentMailbox = $derived(mail.mailboxByRouteId(currentRouteId));
	const onHighlights = $derived(mailRouteId === MAIL_ROUTE_SEGMENTS.important);

	const currentHref = $derived(
		onHighlights
			? mailListHref(INBOX_MAILBOX_ROUTE_ID)
			: mailListHref(currentRouteId)
	);
	const currentLabel = $derived(
		onHighlights || currentRouteId === INBOX_MAILBOX_ROUTE_ID
			? 'All'
			: (currentMailbox?.name ?? 'Current')
	);

	const unseenHref = $derived(`${mailListHref(INBOX_MAILBOX_ROUTE_ID)}?filter=unseen`);
	const highlightsHref = $derived(mailListHref(MAIL_ROUTE_SEGMENTS.important));

	const activeSegment = $derived.by(() => {
		if (!mailRouteId) return undefined;
		if (unseenFilterActive && mailRouteId === INBOX_MAILBOX_ROUTE_ID) return 'unseen';
		if (mailRouteId === MAIL_ROUTE_SEGMENTS.important) return 'highlights';
		return 'current';
	});
</script>

<div class="z-mobile-island__tabs">
	<button
		type="button"
		class="z-mobile-island__icon-btn"
		aria-label="Show apps"
		onclick={() => (mobileIsland.appsOverlay = true)}
	>
		<LayoutGrid class="size-[1.125rem]" aria-hidden="true" />
	</button>

	<button
		type="button"
		class="z-mobile-island__icon-btn"
		aria-label="All mailboxes and folders"
		aria-expanded={mobileIsland.mailboxDrawerOpen}
		onclick={() => mobileIsland.openMailboxDrawer()}
	>
		<FolderInput class="size-[1.125rem]" aria-hidden="true" />
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
				<SegmentGroupItem value="current" href={currentHref} class={ISLAND_RAIL_ITEM_CLASS}>
					<SegmentGroupItemText>{currentLabel}</SegmentGroupItemText>
				</SegmentGroupItem>
				<SegmentGroupItem value="highlights" href={highlightsHref} class={ISLAND_RAIL_ITEM_CLASS}>
					<SegmentGroupItemText>{MAILBOX_DISPLAY_NAMES.important}</SegmentGroupItemText>
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
