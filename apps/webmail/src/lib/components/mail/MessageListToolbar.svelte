<script lang="ts">
	import { page } from '$app/stores';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
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
	class={cn(
		'z-mail-list-toolbar flex w-full min-w-0 items-center',
		disabled && 'pointer-events-none opacity-60',
		className
	)}
	aria-label="Message list"
>
	<div class="z-mail-list-toolbar__selectors">
		<div class="z-mail-list-checkbox-col">
			<MessageListMasterCheckbox class="z-mail-list-bulk-bar__checkbox" />
		</div>
		<MessageListSelectMenu {disabled} />
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
