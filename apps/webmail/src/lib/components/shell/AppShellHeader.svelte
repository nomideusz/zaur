<script lang="ts">
	import { page } from '$app/state';
	import GlobalSearch from '$lib/components/shell/GlobalSearch.svelte';
	import OfflineIndicator from '$lib/components/shell/OfflineIndicator.svelte';
	import ToolSwitcher from '$lib/components/shell/ToolSwitcher.svelte';
	import UserMenu from '$lib/components/shell/UserMenu.svelte';
	import { appConfig } from '$lib/config';
	import { isMailPath } from '$lib/mail/routes';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	/* Desktop-only chrome — on phones the mobile island carries navigation
	   and the pages own their toolbars. */

	const homeHref = $derived(settings.preferredMailHref());
	const pathname = $derived(page.url.pathname);
	const onMailRoute = $derived(pathname === '/' || isMailPath(pathname));
	const onContactsRoute = $derived(pathname.startsWith('/contacts'));
	const onCalendarRoute = $derived(pathname.startsWith('/calendar'));
	const onMailCompose = $derived(pathname.startsWith('/mail/compose'));
	const onMailSearch = $derived(pathname.startsWith('/mail/search'));
	const mailCtx = $derived(shellHeader.mail);

	const mailBulkActive = $derived(
		onMailRoute && !onMailCompose && mail.hasSelection && !!mailCtx?.mailboxRouteId
	);
	const pageCtx = $derived(shellHeader.page);

	/** Primary action hides while bulk selection owns the mail list. */
	const actionContextActive = $derived(!onMailCompose && !onMailSearch && !mailBulkActive);

	const showComposeAction = $derived(onMailRoute && actionContextActive);

	const showCalendarAction = $derived(
		onCalendarRoute && actionContextActive && calendar.supported !== false
	);

	const pagePrimaryAction = $derived(pageCtx?.primaryAction);
	const showContactsAction = $derived(
		onContactsRoute && actionContextActive && !!pagePrimaryAction
	);
</script>

<header
	class="z-app-shell-header relative z-40 hidden h-(--height-header) w-full shrink-0 border-b border-border/50 bg-surface-raised/80 backdrop-blur-xl backdrop-saturate-150 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3 md:px-4"
	style="view-transition-name: app-header;"
>
	<div
		class="z-app-shell-header__start relative z-10 flex min-w-0 shrink-0 items-center gap-3 md:col-start-1 md:justify-self-start"
	>
		<a
			href={homeHref}
			class="inline-flex shrink-0 text-base text-fg transition-opacity hover:opacity-80"
		>
			<span class="text-lg font-extrabold lowercase tracking-tight text-accent">
				{appConfig.brandName}
			</span>
		</a>

		<ToolSwitcher />
	</div>

	<div
		class="z-app-shell-header__center relative z-10 w-full min-w-0 max-w-xl md:col-start-2 md:justify-self-center"
	>
		<GlobalSearch />
	</div>

	<div
		class="z-app-shell-header__end relative z-10 flex shrink-0 items-center gap-2 md:col-start-3 md:justify-self-end"
	>
		<OfflineIndicator />

		{#if showCalendarAction}
			<button
				type="button"
				class="z-mail-text-nav__action z-mail-text-nav__action--pill shrink-0"
				onclick={() => calendar.openCompose()}
			>
				New event
			</button>
		{:else if showComposeAction}
			<a
				href="/mail/compose"
				class="z-mail-text-nav__action z-mail-text-nav__action--pill shrink-0"
			>
				New message
			</a>
		{:else if showContactsAction && pagePrimaryAction?.kind === 'button'}
			{@const action = pagePrimaryAction}
			<button
				type="button"
				class="z-mail-text-nav__action z-mail-text-nav__action--pill shrink-0"
				onclick={action.onclick}
			>
				{action.label}
			</button>
		{:else if showContactsAction && pagePrimaryAction?.kind === 'link'}
			{@const action = pagePrimaryAction}
			<a href={action.href} class="z-mail-text-nav__action z-mail-text-nav__action--pill shrink-0">
				{action.label}
			</a>
		{/if}

		<UserMenu />
	</div>
</header>
