<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import Menu from '$lib/components/icons/Menu.svelte';
	import { isMailPath } from '$lib/mail/routes';
	import { attachIslandScrollEngine } from '$lib/shell/island-scroll';
	import { mail } from '$lib/stores/mail.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { cn } from '$lib/utils/cn';
	import IslandBulkActions from './IslandBulkActions.svelte';
	import IslandMailTabs from './IslandMailTabs.svelte';
	import IslandMinimal from './IslandMinimal.svelte';
	import IslandReaderActions from './IslandReaderActions.svelte';

	type IslandMode = 'mail' | 'bulk' | 'reader' | 'default';

	const pathname = $derived($page.url.pathname);
	const onMailCompose = $derived(pathname.startsWith('/mail/compose'));
	const onMailSearch = $derived(pathname.startsWith('/mail/search'));
	const onMailThread = $derived(/^\/mail\/[^/]+\/[^/]+/.test(pathname));
	const onMailList = $derived(
		(pathname === '/' || isMailPath(pathname)) && !onMailCompose && !onMailSearch && !onMailThread
	);

	const islandMode = $derived.by((): IslandMode => {
		if (onMailThread && mobileIsland.reader) return 'reader';
		if (onMailList && mail.hasSelection && shellHeader.mail?.mailboxRouteId) return 'bulk';
		if (onMailList) return 'mail';
		return 'default';
	});

	const islandWide = $derived(islandMode === 'mail' || islandMode === 'bulk');
	const scrollCollapsible = $derived(islandMode === 'mail');
	const collapsed = $derived(scrollCollapsible && mobileIsland.collapsed);

	$effect(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		const collapsible = scrollCollapsible;
		let detach: (() => void) | null = null;

		const sync = () => {
			detach?.();
			detach = null;
			if (mq.matches && collapsible) {
				detach = attachIslandScrollEngine();
			} else {
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

	$effect(() => {
		void islandMode;
		mobileIsland.expand();
	});

	afterNavigate(() => {
		mobileIsland.expand();
		mobileIsland.closeNavDrawer();
	});

	let positionerEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const el = positionerEl;
		const vv = window.visualViewport;
		if (!el || !vv) return;
		const update = () => {
			const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
			el.style.transform = offset > 1 ? `translateY(-${offset}px)` : '';
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
	<div
		class={cn(
			'z-mobile-island',
			islandWide && 'z-mobile-island--wide',
			collapsed && 'z-mobile-island--collapsed'
		)}
	>
		<div class="z-mobile-island__content" aria-hidden={collapsed}>
			{#if islandMode === 'reader'}
				<IslandReaderActions />
			{:else if islandMode === 'bulk'}
				<IslandBulkActions />
			{:else if islandMode === 'mail'}
				<IslandMailTabs />
			{:else}
				<IslandMinimal />
			{/if}
		</div>

		{#if scrollCollapsible}
			<button
				type="button"
				class="z-mobile-island__pill"
				aria-label="Expand mail navigation"
				onclick={() => mobileIsland.expand()}
			>
				<Menu class="size-5" aria-hidden="true" />
			</button>
		{/if}
	</div>
</div>
