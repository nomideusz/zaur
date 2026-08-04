<script lang="ts">
	import { page } from '$app/stores';
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
		MOBILE_RAIL_GROUP_CLASS,
		MOBILE_RAIL_INDICATOR_CLASS,
		TOPBAR_RAIL_ITEM_CLASS
	} from '$lib/shell/mobile-rail';
	import { mail } from '$lib/stores/mail.svelte';

	interface Props {
		itemClass?: string;
	}

	let { itemClass = TOPBAR_RAIL_ITEM_CLASS }: Props = $props();

	const pathname = $derived($page.url.pathname);
	const mailCtx = $derived(parseMailContext(pathname));
	const mailRouteId = $derived(
		mailCtx?.kind === 'mailbox' ? (mailCtx.mailboxRouteId ?? INBOX_MAILBOX_ROUTE_ID) : null
	);
	const unseenFilterActive = $derived($page.url.searchParams.get('filter') === 'unseen');

	const inboxHref = $derived(mailListHref(INBOX_MAILBOX_ROUTE_ID));
	const unseenHref = $derived(`${inboxHref}?filter=unseen`);
	const importantHref = $derived(mailListHref(MAIL_ROUTE_SEGMENTS.important));

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

<nav class="min-w-0 flex-1" aria-label="Mail views">
	<SegmentGroupScroll activeValue={activeSegment} class="w-full">
		<SegmentGroup
			value={activeSegment}
			track={false}
			indicatorClass={MOBILE_RAIL_INDICATOR_CLASS}
			class={MOBILE_RAIL_GROUP_CLASS}
		>
			<SegmentGroupItem value="unseen" href={unseenHref} class={itemClass}>
				<SegmentGroupItemText>{LABEL_UNSEEN}</SegmentGroupItemText>
			</SegmentGroupItem>
			<SegmentGroupItem value="all" href={inboxHref} class={itemClass}>
				<SegmentGroupItemText>All</SegmentGroupItemText>
			</SegmentGroupItem>
			{#if folderContextRouteId && folderContextLabel}
				<SegmentGroupItem value={folderContextRouteId} static class={itemClass}>
					<SegmentGroupItemText>{folderContextLabel}</SegmentGroupItemText>
				</SegmentGroupItem>
			{/if}
			<SegmentGroupItem value="important" href={importantHref} class={itemClass}>
				<SegmentGroupItemText>Highlights</SegmentGroupItemText>
			</SegmentGroupItem>
		</SegmentGroup>
	</SegmentGroupScroll>
</nav>
