<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Menu from '$lib/components/icons/Menu.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import X from '$lib/components/icons/X.svelte';
	import IslandAccountRail from '$lib/components/shell/island/IslandAccountRail.svelte';
	import MailViewTabs from '$lib/components/shell/MailViewTabs.svelte';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText,
		SegmentGroupScroll
	} from '$lib/components/ui/segment-group';
	import { isMailPath } from '$lib/mail/routes';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import {
		isSectionSearchRoute,
		topSearchSection,
		topSearchSuppressed
	} from '$lib/shell/app-nav';
	import {
		MOBILE_RAIL_GROUP_CLASS,
		MOBILE_RAIL_INDICATOR_CLASS,
		TOPBAR_RAIL_ITEM_CLASS
	} from '$lib/shell/mobile-rail';
	import { calendar, type CalendarViewTab } from '$lib/stores/calendar.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const pathname = $derived(page.url.pathname);
	const onMailCompose = $derived(pathname.startsWith('/mail/compose'));
	const onMailThread = $derived(/^\/mail\/[^/]+\/[^/]+/.test(pathname));
	const onMailList = $derived(
		(pathname === '/' || isMailPath(pathname)) && !onMailCompose && !onMailThread
	);
	const onSettings = $derived(pathname.startsWith('/settings'));
	const onCalendar = $derived(pathname.startsWith('/calendar'));
	const onContacts = $derived(pathname.startsWith('/contacts'));
	const suppressed = $derived(topSearchSuppressed(pathname));

	const section = $derived(topSearchSection(pathname));
	const searchExpanded = $derived(
		!!section &&
			!suppressed &&
			(settings.showSearchBar || mobileIsland.searchBarOpen || page.url.searchParams.has('q'))
	);

	const showBar = $derived(!suppressed || onMailThread || onMailCompose);
	const showFilters = $derived(onMailList && !searchExpanded);
	const showSettingsTabs = $derived(onSettings && !searchExpanded);
	const showCalendarTabs = $derived(onCalendar && !searchExpanded);
	const showSectionTitle = $derived(onContacts && !searchExpanded);

	const settingsLinks = $derived(settingsNavLinks('mobile'));
	const activeSettingsHref = $derived(
		settingsLinks.find((link) => isSettingsNavActive(pathname, link.href))?.href
	);

	const calendarViews: { id: CalendarViewTab; label: string }[] = [
		{ id: 'week', label: 'Week' },
		{ id: 'day', label: 'Day' },
		{ id: 'agendas', label: 'Agenda' }
	];

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
		if (!mobileIsland.searchBarFocusPending || !searchExpanded || !inputEl) return;
		mobileIsland.searchBarFocusPending = false;
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
			mobileIsland.searchBarOpen = true;
			mobileIsland.searchBarFocusPending = true;
			return;
		}
		mobileIsland.searchBarOpen = true;
		mobileIsland.searchBarFocusPending = true;
	}

	function closeSearch() {
		if (timer) clearTimeout(timer);
		value = '';
		mobileIsland.searchBarOpen = false;
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
					class="z-mobile-topbar__icon-btn"
					aria-label="Apps and folders"
					aria-expanded={mobileIsland.navDrawerOpen}
					onclick={() => mobileIsland.openNavDrawer()}
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
					class="z-mobile-topbar__icon-btn"
					aria-label="Close search"
					onclick={closeSearch}
				>
					<X class="size-[1.125rem]" aria-hidden="true" />
				</button>
			</form>
		{:else}
			<div class="z-mobile-topbar__row">
				<button
					type="button"
					class="z-mobile-topbar__icon-btn"
					aria-label="Apps and folders"
					aria-expanded={mobileIsland.navDrawerOpen}
					onclick={() => mobileIsland.openNavDrawer()}
				>
					<Menu class="size-[1.125rem]" aria-hidden="true" />
				</button>

				{#if showFilters}
					<MailViewTabs />
				{:else if showSettingsTabs}
					<nav class="min-w-0 flex-1" aria-label="Settings sections">
						<SegmentGroupScroll activeValue={activeSettingsHref} class="w-full">
							<SegmentGroup
								value={activeSettingsHref}
								track={false}
								indicatorClass={MOBILE_RAIL_INDICATOR_CLASS}
								class={MOBILE_RAIL_GROUP_CLASS}
							>
								{#each settingsLinks as link (link.href)}
									<SegmentGroupItem
										value={link.href}
										href={link.href}
										class={TOPBAR_RAIL_ITEM_CLASS}
									>
										<SegmentGroupItemText>{link.label}</SegmentGroupItemText>
									</SegmentGroupItem>
								{/each}
							</SegmentGroup>
						</SegmentGroupScroll>
					</nav>
				{:else if showCalendarTabs}
					<nav class="min-w-0 flex-1" aria-label="Calendar views">
						<SegmentGroupScroll activeValue={calendar.activeView} class="w-full">
							<SegmentGroup
								value={calendar.activeView}
								onValueChange={(value) => (calendar.activeView = value as CalendarViewTab)}
								track={false}
								indicatorClass={MOBILE_RAIL_INDICATOR_CLASS}
								class={MOBILE_RAIL_GROUP_CLASS}
							>
								{#each calendarViews as view (view.id)}
									<SegmentGroupItem value={view.id} class={TOPBAR_RAIL_ITEM_CLASS}>
										<SegmentGroupItemText>{view.label}</SegmentGroupItemText>
									</SegmentGroupItem>
								{/each}
							</SegmentGroup>
						</SegmentGroupScroll>
					</nav>
				{:else if showSectionTitle}
					<div class="min-w-0 flex-1 px-2 text-sm font-medium text-fg">Contacts</div>
				{:else if onMailThread}
					<div class="min-w-0 flex-1 px-2 text-sm text-fg-muted truncate">Message</div>
				{:else if onMailCompose}
					<div class="min-w-0 flex-1 px-2 text-sm text-fg-muted truncate">Compose</div>
				{:else}
					<div class="min-w-0 flex-1" aria-hidden="true"></div>
				{/if}

				{#if section && !onMailCompose}
					<button
						type="button"
						class="z-mobile-topbar__icon-btn"
						aria-label="Search"
						onclick={openSearch}
					>
						<Search class="size-[1.125rem]" aria-hidden="true" />
					</button>
				{/if}

				<IslandAccountRail />
			</div>
		{/if}
	</header>
{/if}
