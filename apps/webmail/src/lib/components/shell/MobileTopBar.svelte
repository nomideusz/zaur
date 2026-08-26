<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Menu from '$lib/components/icons/Menu.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import X from '$lib/components/icons/X.svelte';
	import ComposeSendSplit from '$lib/components/mail/ComposeSendSplit.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import { LABEL_UNSEEN } from '$lib/mail/new-mail';
	import { INBOX_MAILBOX_ROUTE_ID, isMailPath, parseMailContext } from '$lib/mail/routes';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import {
		isSectionSearchRoute,
		topSearchSection,
		topSearchSuppressed
	} from '$lib/shell/app-nav';
	import { mail } from '$lib/stores/mail.svelte';
	import { mobileShell } from '$lib/stores/mobile-shell.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const pathname = $derived(page.url.pathname);
	const onMailCompose = $derived(pathname.startsWith('/mail/compose'));
	const onMailThread = $derived(/^\/mail\/[^/]+\/[^/]+/.test(pathname));
	const onMailList = $derived(
		(pathname === '/' || isMailPath(pathname)) && !onMailCompose && !onMailThread
	);
	const onSettings = $derived(pathname.startsWith('/settings'));
	const onSettingsSection = $derived(pathname.startsWith('/settings/'));
	const suppressed = $derived(topSearchSuppressed(pathname));

	const section = $derived(topSearchSection(pathname));
	const searchExpanded = $derived(
		!!section &&
			!suppressed &&
			(settings.showSearchBar || mobileShell.searchBarOpen || page.url.searchParams.has('q'))
	);

	const showBar = $derived(!suppressed || onMailThread || onMailCompose);

	/* Inner screens: back in the top bar; compose shows title + Send here;
	   reader shows thread actions here. */
	const backHref = $derived(mobileShell.reader?.listHref ?? settings.preferredMailHref());
	const composeCtx = $derived(mobileShell.compose);
	const readerCtx = $derived(mobileShell.reader);

	function composeBack() {
		const ctx = mobileShell.compose;
		if (ctx) ctx.onBack();
		else history.back();
	}

	/* Plain title in the middle — all navigation lives in the hamburger drawer. */
	const title = $derived.by(() => {
		if (onMailThread || onMailCompose) return null;
		if (onMailList) {
			if (page.url.searchParams.get('filter') === 'unseen') return LABEL_UNSEEN;
			const ctx = parseMailContext(pathname);
			const routeId =
				ctx?.kind === 'mailbox'
					? (ctx.mailboxRouteId ?? INBOX_MAILBOX_ROUTE_ID)
					: INBOX_MAILBOX_ROUTE_ID;
			return mail.mailboxByRouteId(routeId)?.name ?? 'Mail';
		}
		if (onSettingsSection) {
			return (
				settingsNavLinks('mobile').find((link) => isSettingsNavActive(pathname, link.href))
					?.label ?? 'Settings'
			);
		}
		if (onSettings) return 'Settings';
		if (pathname.startsWith('/calendar')) return 'Calendar';
		if (pathname.startsWith('/contacts')) return 'Contacts';
		if (pathname.startsWith('/files')) return 'Files';
		return null;
	});

	const inPlace = $derived(section?.id === 'mail');
	const searchBase = $derived(inPlace ? pathname : (section?.searchPath ?? pathname));
	const clearBase = $derived(inPlace ? pathname : (section?.homePath ?? pathname));
	const onResults = $derived(
		inPlace ? page.url.searchParams.has('q') : isSectionSearchRoute(pathname)
	);

	let value = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (!mobileShell.searchBarFocusPending || !searchExpanded || !inputEl) return;
		mobileShell.searchBarFocusPending = false;
		const el = inputEl;
		setTimeout(() => el.focus(), 50);
	});

	$effect(() => {
		const urlQuery = onResults ? (page.url.searchParams.get('q') ?? '') : '';
		if (inputEl && document.activeElement === inputEl) return;
		value = urlQuery;
	});

	function openSearch() {
		if (!section) {
			void goto(settings.preferredMailHref());
		}
		mobileShell.searchBarOpen = true;
		mobileShell.searchBarFocusPending = true;
	}

	function closeSearch() {
		if (timer) clearTimeout(timer);
		value = '';
		mobileShell.searchBarOpen = false;
		if (onResults) void goto(clearBase, { noScroll: true });
	}

	function commit(next: string) {
		if (!section) return;
		const trimmed = next.trim();
		if (trimmed) {
			void goto(`${searchBase}?q=${encodeURIComponent(trimmed)}`, {
				replaceState: onResults,
				keepFocus: true,
				noScroll: true
			});
		} else {
			void goto(clearBase, { keepFocus: true, noScroll: true });
		}
	}

	function onInput() {
		if (timer) clearTimeout(timer);
		const next = value;
		timer = setTimeout(() => commit(next), 200);
	}

	function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (timer) clearTimeout(timer);
		commit(value);
		inputEl?.blur();
	}
</script>

{#if showBar}
	<header class="z-mobile-topbar md:hidden" data-testid="mobile-topbar">
		{#if searchExpanded && section}
			<form class="z-mobile-topbar__search" role="search" onsubmit={onSubmit}>
				<button
					type="button"
					class="z-chrome-icon-btn"
					aria-label="Apps and folders"
					aria-expanded={mobileShell.navDrawerOpen}
					onclick={() => mobileShell.openNavDrawer()}
				>
					<Menu class="size-[1.125rem]" aria-hidden="true" />
				</button>
				<div class="z-mobile-topbar__search-field">
					<Search class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
					<input
						bind:this={inputEl}
						bind:value
						oninput={onInput}
						type="search"
						enterkeyhint="search"
						inputmode="search"
						autocomplete="off"
						class="z-mobile-topbar__search-input"
						placeholder={section.placeholder}
						aria-label={section.placeholder}
					/>
					{#if value}
						<button
							type="button"
							class="z-mobile-topbar__clear"
							aria-label="Clear search"
							onclick={closeSearch}
						>
							<X class="size-4" aria-hidden="true" />
						</button>
					{/if}
				</div>
				<button
					type="button"
					class="z-chrome-icon-btn"
					aria-label="Close search"
					onclick={closeSearch}
				>
					<X class="size-[1.125rem]" aria-hidden="true" />
				</button>
			</form>
		{:else}
			<div class="z-mobile-topbar__row">
				{#if onMailThread}
					<a href={backHref} class="z-chrome-icon-btn no-underline" aria-label="Back to list">
						<ArrowLeft class="size-[1.125rem]" aria-hidden="true" />
					</a>
				{:else if onMailCompose}
					<button
						type="button"
						class="z-chrome-icon-btn"
						aria-label="Save draft and go back"
						onclick={composeBack}
					>
						<ArrowLeft class="size-[1.125rem]" aria-hidden="true" />
					</button>
				{:else if onSettingsSection}
					<a
						href="/settings"
						class="z-chrome-icon-btn no-underline"
						aria-label="Back to settings"
					>
						<ArrowLeft class="size-[1.125rem]" aria-hidden="true" />
					</a>
				{:else}
					<button
						type="button"
						class="z-chrome-icon-btn"
						aria-label="Apps and folders"
						aria-expanded={mobileShell.navDrawerOpen}
						onclick={() => mobileShell.openNavDrawer()}
					>
						<Menu class="size-[1.125rem]" aria-hidden="true" />
					</button>
				{/if}

				{#if onMailCompose && composeCtx}
					<div class="min-w-0 flex-1 truncate px-2 text-sm font-medium text-fg" aria-live="polite">
						{composeCtx.title}
					</div>
				{:else if title}
					<div class="min-w-0 flex-1 truncate px-2 text-sm font-medium text-fg">{title}</div>
				{:else}
					<!-- Thread: subject stays inline in the reader body. -->
					<div class="min-w-0 flex-1" aria-hidden="true"></div>
				{/if}

				{#if onMailCompose && composeCtx}
					<div class="z-header-action-zone shrink-0">
						<ComposeSendSplit
							sendLabel={composeCtx.sendLabel}
							sendDisabled={composeCtx.sendDisabled}
							sendBlockedReason={composeCtx.sendBlockedReason}
							scheduleDisabled={composeCtx.scheduleDisabled}
							showSchedulePanel={composeCtx.showSchedulePanel}
							onToggleSchedule={composeCtx.toggleSchedulePanel}
							onCloseSchedule={composeCtx.closeSchedulePanel}
							schedulePresets={composeCtx.schedulePresets}
							onSchedule={composeCtx.scheduleSendAt}
							customSendTime={composeCtx.customSendTime}
							onCustomSendTimeChange={composeCtx.setCustomSendTime}
							customSendTimeMin={composeCtx.customSendTimeMin}
							formatScheduleTime={composeCtx.formatScheduleTime}
							compact
						/>
					</div>
				{:else if onMailThread && readerCtx}
					<div class="z-mobile-topbar__reader-actions shrink-0">
						<!-- Props are lazy getters: the child can re-read them after an account
						     switch nulls mobileShell.reader but before this block tears down,
						     so every access must tolerate readerCtx being gone (JAVASCRIPT-B). -->
						<MessageThreadActions
							thread={readerCtx?.thread ?? []}
							mailboxRouteId={readerCtx?.mailboxRouteId ?? INBOX_MAILBOX_ROUTE_ID}
							onMoved={readerCtx?.onMoved}
							onBackToList={readerCtx?.onBackToList}
							menuPlacement="bottom"
							menuId="topbar-reader-actions-menu"
							variant="topbar"
						/>
					</div>
				{:else if section}
					<button
						type="button"
						class="z-chrome-icon-btn"
						aria-label="Search"
						onclick={openSearch}
					>
						<Search class="size-[1.125rem]" aria-hidden="true" />
					</button>
				{/if}
			</div>
		{/if}
	</header>
{/if}
