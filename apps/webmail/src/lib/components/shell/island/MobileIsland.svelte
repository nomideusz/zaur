<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import Mail from '$lib/components/icons/Mail.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import Reply from '$lib/components/icons/Reply.svelte';
	import { isMailPath } from '$lib/mail/routes';
	import { activeMobileNavItem } from '$lib/shell/app-nav';
	import { attachIslandScrollEngine } from '$lib/shell/island-scroll';
	import { mail } from '$lib/stores/mail.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { cn } from '$lib/utils/cn';
	import { visualViewportKeyboardOffset } from '$lib/utils/visual-viewport';
	import IslandBulkActions from './IslandBulkActions.svelte';
	import IslandCalendarNav from './IslandCalendarNav.svelte';
	import IslandComposeActions from './IslandComposeActions.svelte';
	import IslandMailTabs from './IslandMailTabs.svelte';
	import IslandMinimal from './IslandMinimal.svelte';
	import IslandReaderActions from './IslandReaderActions.svelte';
	import IslandSectionNav from './IslandSectionNav.svelte';
	import IslandSettingsNav from './IslandSettingsNav.svelte';

	type IslandMode = 'mail' | 'bulk' | 'reader' | 'compose' | 'section' | 'default';

	const pathname = $derived($page.url.pathname);
	const onMailCompose = $derived(pathname.startsWith('/mail/compose'));
	const onMailSearch = $derived(pathname.startsWith('/mail/search'));
	const onMailThread = $derived(/^\/mail\/[^/]+\/[^/]+/.test(pathname));
	const onMailList = $derived(
		(pathname === '/' || isMailPath(pathname)) && !onMailCompose && !onMailSearch && !onMailThread
	);
	const onSettings = $derived(pathname.startsWith('/settings'));
	const onCalendar = $derived(pathname.startsWith('/calendar'));
	const onSection = $derived(onCalendar || pathname.startsWith('/contacts') || onSettings);

	const islandMode = $derived.by((): IslandMode => {
		if (onMailCompose && mobileIsland.compose) return 'compose';
		if (onMailThread && mobileIsland.reader) return 'reader';
		if (onMailList && mail.hasSelection && shellHeader.mail?.mailboxRouteId) return 'bulk';
		if (onMailList) return 'mail';
		if (onSection) return 'section';
		return 'default';
	});

	/* Action modes stay usable — bulk / reader / compose never scroll-shrink. */
	const collapsible = $derived(
		islandMode === 'mail' || islandMode === 'section' || islandMode === 'default'
	);
	const collapsed = $derived(mobileIsland.collapsed && collapsible);

	/* Browse modes use a compact compose/action pill; only action docks go wide. */
	const islandWide = $derived(
		!collapsed &&
			(islandMode === 'bulk' || islandMode === 'reader' || islandMode === 'compose')
	);

	/** Settings / empty default — chrome moved to MobileTopBar; hide the dock. */
	const islandHidden = $derived(
		(islandMode === 'section' && onSettings) || islandMode === 'default'
	);

	const PillIcon = $derived.by(() => {
		if (islandMode === 'reader') return Reply;
		if (islandMode === 'compose') return PenSquare;
		return activeMobileNavItem(pathname)?.icon ?? Mail;
	});

	$effect(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		let detach: (() => void) | null = null;
		const sync = () => {
			if (mq.matches && !detach) {
				detach = attachIslandScrollEngine();
			} else if (!mq.matches && detach) {
				detach();
				detach = null;
				mobileIsland.collapsed = false;
			}
		};
		sync();
		mq.addEventListener('change', sync);
		return () => {
			mq.removeEventListener('change', sync);
			detach?.();
		};
	});

	/* A mode change is a context change — always come back expanded. */
	$effect(() => {
		void islandMode;
		mobileIsland.expand();
	});

	afterNavigate(() => {
		mobileIsland.closeNavDrawer();
		mobileIsland.closeAccountSwitcher();
		mobileIsland.expand();
	});

	let positionerEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const el = positionerEl;
		const vv = window.visualViewport;
		if (!el || !vv) return;
		const update = () => {
			const offset = visualViewportKeyboardOffset();
			el.style.transform = offset > 0 ? `translateY(-${offset}px)` : '';
		};
		update();
		vv.addEventListener('resize', update);
		vv.addEventListener('scroll', update);
		return () => {
			vv.removeEventListener('resize', update);
			vv.removeEventListener('scroll', update);
			el.style.transform = '';
		};
	});
</script>

<div
	class={cn('z-mobile-island-positioner md:hidden', islandHidden && 'hidden')}
	bind:this={positionerEl}
>
	<div
		class={cn(
			'z-mobile-island',
			islandWide && 'z-mobile-island--wide',
			collapsed && 'z-mobile-island--collapsed'
		)}
	>
		<div class="z-mobile-island__content" inert={collapsed || undefined}>
			{#if islandMode === 'compose'}
				<IslandComposeActions />
			{:else if islandMode === 'reader'}
				<IslandReaderActions />
			{:else if islandMode === 'bulk'}
				<IslandBulkActions />
			{:else if islandMode === 'mail'}
				<IslandMailTabs />
			{:else if islandMode === 'section'}
				{#if onSettings}
					<IslandSettingsNav />
				{:else if onCalendar}
					<IslandCalendarNav />
				{:else}
					<IslandSectionNav />
				{/if}
			{:else}
				<IslandMinimal />
			{/if}
		</div>
		<button
			type="button"
			class="z-mobile-island__pill"
			aria-label="Show navigation"
			aria-expanded={!collapsed}
			inert={!collapsed || undefined}
			onclick={() => mobileIsland.expand()}
		>
			<PillIcon class="size-[1.125rem]" aria-hidden="true" />
		</button>
	</div>
</div>
