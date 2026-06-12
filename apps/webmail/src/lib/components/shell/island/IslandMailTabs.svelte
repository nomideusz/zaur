<script lang="ts">
	import { page } from '$app/stores';
	import LayoutGrid from '$lib/components/icons/LayoutGrid.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText,
		SegmentGroupScroll
	} from '$lib/components/ui/segment-group';
	import { sidebarMailboxGroups } from '$lib/mail/mailboxes';
	import { LABEL_UNSEEN } from '$lib/mail/new-mail';
	import {
		INBOX_MAILBOX_ROUTE_ID,
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
	const unseenHref = $derived(
		`${mailListHref(mailRouteId ?? INBOX_MAILBOX_ROUTE_ID)}?filter=unseen`
	);
	const activeSegment = $derived(
		unseenFilterActive ? 'unseen' : (mailRouteId ?? undefined)
	);

	const folderSegments = $derived.by(() => {
		const groups = sidebarMailboxGroups(mail.mailboxes);
		return [...groups.system, ...groups.custom];
	});

	function segmentLabel(mailbox: (typeof folderSegments)[number]): string {
		return mailbox.id === INBOX_MAILBOX_ROUTE_ID ? 'All' : mailbox.name;
	}
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

	<nav class="min-w-0 flex-1" aria-label="Mail folders">
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
				{#each folderSegments as mailbox (mailbox.id)}
					<SegmentGroupItem
						value={mailbox.id}
						href={mailListHref(mailbox.id)}
						class={ISLAND_RAIL_ITEM_CLASS}
					>
						<SegmentGroupItemText>{segmentLabel(mailbox)}</SegmentGroupItemText>
					</SegmentGroupItem>
				{/each}
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
