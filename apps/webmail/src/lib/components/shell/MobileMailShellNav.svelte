<script lang="ts">
	import { page } from '$app/stores';
	import {
		isPrimarySidebarMailbox,
		primarySidebarMailboxRank
	} from '$lib/mail/mailboxes';
	import {
		INBOX_MAILBOX_ROUTE_ID,
		mailListHref,
		parseMailContext
	} from '$lib/mail/routes';
	import { mail } from '$lib/stores/mail.svelte';
	import { LABEL_UNSEEN } from '$lib/mail/new-mail';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText,
		SegmentGroupScroll
	} from '$lib/components/ui/segment-group';

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

	const folderSegments = $derived(
		[...mail.mailboxes]
			.filter((mb) => isPrimarySidebarMailbox(mb.role))
			.sort((a, b) => {
				const aRank = primarySidebarMailboxRank(a.role);
				const bRank = primarySidebarMailboxRank(b.role);
				return aRank - bRank || a.name.localeCompare(b.name);
			})
	);

	function segmentLabel(mailbox: (typeof folderSegments)[number]): string {
		return mailbox.id === INBOX_MAILBOX_ROUTE_ID ? 'All' : mailbox.name;
	}
</script>

<nav class="z-mail-folder-segments w-full min-w-0 md:hidden" aria-label="Mail folders">
	<SegmentGroupScroll activeValue={activeSegment} class="w-full">
		<SegmentGroup
			value={activeSegment}
			track={false}
			indicatorClass="z-segment-group__indicator--accent rounded-md"
			class="rounded-lg px-0.5"
		>
			<SegmentGroupItem
				value="unseen"
				href={unseenHref}
				class="px-2.5 py-1.5 text-sm font-medium text-fg-muted data-[state=checked]:font-semibold data-[state=checked]:text-fg"
			>
				<SegmentGroupItemText>{LABEL_UNSEEN}</SegmentGroupItemText>
			</SegmentGroupItem>
			{#each folderSegments as mailbox (mailbox.id)}
				<SegmentGroupItem
					value={mailbox.id}
					href={mailListHref(mailbox.id)}
					class="px-2.5 py-1.5 text-sm font-medium text-fg-muted data-[state=checked]:font-semibold data-[state=checked]:text-fg"
				>
					<SegmentGroupItemText>{segmentLabel(mailbox)}</SegmentGroupItemText>
				</SegmentGroupItem>
			{/each}
		</SegmentGroup>
	</SegmentGroupScroll>
</nav>
