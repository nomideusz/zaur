<script lang="ts">
	import { page } from '$app/stores';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import { LABEL_UNSEEN } from '$lib/mail/new-mail';
	import {
		INBOX_MAILBOX_ROUTE_ID,
		mailListHref,
		parseMailContext
	} from '$lib/mail/routes';
	import { cn } from '$lib/utils/cn';

	interface Props {
		disabled?: boolean;
		class?: string;
	}

	let { disabled = false, class: className = '' }: Props = $props();

	const mailCtx = $derived(parseMailContext($page.url.pathname));
	const mailRouteId = $derived(
		mailCtx?.kind === 'mailbox'
			? (mailCtx.mailboxRouteId ?? INBOX_MAILBOX_ROUTE_ID)
			: INBOX_MAILBOX_ROUTE_ID
	);
	const unseenFilterActive = $derived($page.url.searchParams.get('filter') === 'unseen');
	const unseenToggleHref = $derived(
		unseenFilterActive ? mailListHref(mailRouteId) : `${mailListHref(mailRouteId)}?filter=unseen`
	);
</script>

<nav
	class={cn('z-mail-list-toolbar flex w-full min-w-0 items-center', className)}
	aria-label="Message list"
>
	<!-- Only the bulk-selection control dims when there's nothing to select (empty/loading/error).
	     Compose and the Unseen filter stay usable regardless. The select menu (All / Normal /
	     Unseen / Clear) is the single selection entry point — it sits in the checkbox column so it
	     lines up with the per-row checkboxes, and it makes a separate master checkbox redundant. -->
	<div class={cn('z-mail-list-toolbar__selectors', disabled && 'pointer-events-none opacity-60')}>
		<div class="z-mail-list-checkbox-col">
			<MessageListSelectMenu {disabled} />
		</div>
	</div>
	<a
		href={unseenToggleHref}
		class={cn(
			'z-mail-text-nav__link max-md:hidden',
			unseenFilterActive && 'z-mail-text-nav__link--active'
		)}
		aria-current={unseenFilterActive ? 'page' : undefined}
	>
		{LABEL_UNSEEN}
	</a>
	<div class="z-header-action-zone">
		<a href="/mail/compose" class="z-mail-text-nav__action z-mail-text-nav__action--pill">New message</a>
	</div>
</nav>
