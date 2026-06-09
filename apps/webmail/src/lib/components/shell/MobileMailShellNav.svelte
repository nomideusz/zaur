<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import LogOut from '$lib/components/icons/LogOut.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import {
		isPrimarySidebarMailbox,
		primarySidebarMailboxRank
	} from '$lib/mail/mailboxes';
	import { LABEL_MARK_IMPORTANT } from '$lib/mail/new-mail';
	import {
		INBOX_MAILBOX_ROUTE_ID,
		MAIL_ROUTE_SEGMENTS,
		mailListHref,
		parseMailContext
	} from '$lib/mail/routes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';

	const pathname = $derived($page.url.pathname);
	const mailCtx = $derived(parseMailContext(pathname));
	const mailRouteId = $derived(
		mailCtx?.kind === 'mailbox' ? (mailCtx.mailboxRouteId ?? INBOX_MAILBOX_ROUTE_ID) : null
	);
	const onSearchRoute = $derived(pathname.startsWith('/mail/search'));
	const hasImportantMailbox = $derived(
		mail.mailboxes.some((mb) => mb.role === 'important')
	);

	const moreMailboxes = $derived(
		[...mail.mailboxes]
			.filter(
				(mb) =>
					isPrimarySidebarMailbox(mb.role) &&
					mb.role !== 'inbox' &&
					mb.role !== 'important'
			)
			.sort((a, b) => {
				const aRank = primarySidebarMailboxRank(a.role);
				const bRank = primarySidebarMailboxRank(b.role);
				return aRank - bRank || a.name.localeCompare(b.name);
			})
	);

	function navLinkClass(active: boolean): string {
		return cn('z-mail-text-nav__link shrink-0', active && 'z-mail-text-nav__link--active');
	}

	function goMailbox(routeId: string) {
		const href = mailListHref(routeId);
		if (href !== pathname) void goto(href);
	}

	function goSearch() {
		void goto('/mail/search?focus=1');
	}

	function mailboxMenuLabel(name: string, unread: number): string {
		return unread > 0 ? `${name} (${unread})` : name;
	}
</script>

<nav
	class="flex min-w-0 items-center gap-3 md:hidden"
	aria-label="Mail navigation"
>
	<a
		href={mailListHref(INBOX_MAILBOX_ROUTE_ID)}
		class={navLinkClass(mailRouteId === INBOX_MAILBOX_ROUTE_ID)}
		aria-current={mailRouteId === INBOX_MAILBOX_ROUTE_ID ? 'page' : undefined}
	>
		All
	</a>
	{#if hasImportantMailbox}
		<a
			href={mailListHref(MAIL_ROUTE_SEGMENTS.important)}
			class={navLinkClass(mailRouteId === MAIL_ROUTE_SEGMENTS.important)}
			aria-current={mailRouteId === MAIL_ROUTE_SEGMENTS.important ? 'page' : undefined}
		>
			{LABEL_MARK_IMPORTANT}
		</a>
	{/if}
	<OverflowMenu
		label="More mail options"
		menuId="mobile-mail-more-menu"
		textTrigger
		triggerText="More"
		triggerClass="z-mail-text-nav__link"
	>
		<OverflowMenuItem
			label={onSearchRoute ? 'Search (current)' : 'Search'}
			disabled={onSearchRoute}
			onclick={goSearch}
		>
			{#snippet icon()}
				<Search class="size-5" aria-hidden="true" />
			{/snippet}
		</OverflowMenuItem>
		{#if moreMailboxes.length > 0}
			<div class="mx-4 my-1 border-t border-border" role="separator"></div>
		{/if}
		{#each moreMailboxes as mailbox (mailbox.id)}
			<OverflowMenuItem
				label={mailboxMenuLabel(mailbox.name, mailbox.unread)}
				onclick={() => goMailbox(mailbox.id)}
			/>
		{/each}
		<div class="mx-4 my-1 border-t border-border" role="separator"></div>
		<OverflowMenuItem label="Sign out" onclick={() => auth.logout()}>
			{#snippet icon()}
				<LogOut class="size-5" aria-hidden="true" />
			{/snippet}
		</OverflowMenuItem>
	</OverflowMenu>
</nav>
