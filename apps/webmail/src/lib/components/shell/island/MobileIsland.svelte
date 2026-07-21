<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { isMailPath } from '$lib/mail/routes';
	import { mail } from '$lib/stores/mail.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { cn } from '$lib/utils/cn';
	import { visualViewportKeyboardOffset } from '$lib/utils/visual-viewport';
	import IslandBulkActions from './IslandBulkActions.svelte';
	import IslandMailTabs from './IslandMailTabs.svelte';
	import IslandMinimal from './IslandMinimal.svelte';
	import IslandCalendarNav from './IslandCalendarNav.svelte';
	import IslandReaderActions from './IslandReaderActions.svelte';
	import IslandSectionNav from './IslandSectionNav.svelte';
	import IslandSettingsNav from './IslandSettingsNav.svelte';

	type IslandMode = 'mail' | 'bulk' | 'reader' | 'section' | 'default';

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
		if (onMailThread && mobileIsland.reader) return 'reader';
		if (onMailList && mail.hasSelection && shellHeader.mail?.mailboxRouteId) return 'bulk';
		if (onMailList) return 'mail';
		if (onSection) return 'section';
		return 'default';
	});

	const islandWide = $derived(
		islandMode === 'mail' ||
			islandMode === 'bulk' ||
			islandMode === 'reader' ||
			islandMode === 'section'
	);

	afterNavigate(() => {
		mobileIsland.closeNavDrawer();
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
	class={cn('z-mobile-island-positioner md:hidden', onMailCompose && 'hidden')}
	bind:this={positionerEl}
>
	<div class={cn('z-mobile-island', islandWide && 'z-mobile-island--wide')}>
		<div class="z-mobile-island__content">
			{#if islandMode === 'reader'}
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
	</div>
</div>
