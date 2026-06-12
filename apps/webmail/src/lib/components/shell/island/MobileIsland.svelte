<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import Mail from '$lib/components/icons/Mail.svelte';
	import Reply from '$lib/components/icons/Reply.svelte';
	import { isMailPath } from '$lib/mail/routes';
	import { activeMobileNavItem } from '$lib/shell/app-nav';
	import { attachIslandScrollEngine } from '$lib/shell/island-scroll';
	import { mail } from '$lib/stores/mail.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { cn } from '$lib/utils/cn';
	import { fade, fly } from 'svelte/transition';
	import IslandAppNav from './IslandAppNav.svelte';
	import IslandBulkActions from './IslandBulkActions.svelte';
	import IslandComposeActions from './IslandComposeActions.svelte';
	import IslandMailTabs from './IslandMailTabs.svelte';
	import IslandReaderActions from './IslandReaderActions.svelte';

	type IslandMode = 'app-nav' | 'mail-tabs' | 'bulk' | 'reader' | 'compose';

	const pathname = $derived($page.url.pathname);
	const onMailCompose = $derived(pathname.startsWith('/mail/compose'));
	const onMailSearch = $derived(pathname.startsWith('/mail/search'));
	const onMailThread = $derived(/^\/mail\/[^/]+\/[^/]+/.test(pathname));
	const onMailList = $derived(
		(pathname === '/' || isMailPath(pathname)) && !onMailCompose && !onMailSearch && !onMailThread
	);

	const mode = $derived.by((): IslandMode => {
		if (onMailCompose && mobileIsland.compose) return 'compose';
		if (onMailThread && mobileIsland.reader) return 'reader';
		if (onMailList && mail.hasSelection && shellHeader.mail?.mailboxRouteId) return 'bulk';
		if (onMailList) return mobileIsland.appsOverlay ? 'app-nav' : 'mail-tabs';
		return 'app-nav';
	});

	/* Action modes must stay usable — bulk and compose never scroll-shrink. */
	const collapsible = $derived(mode !== 'bulk' && mode !== 'compose');
	const collapsed = $derived(mobileIsland.collapsed && collapsible);
	/* Full-row modes; nav pills hug their content. */
	const wide = $derived(mode !== 'app-nav' && !collapsed);

	const reduceMotion = $derived(
		settings.reduceMotion ||
			(browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
	);
	const flyIn = $derived({
		y: 8,
		duration: reduceMotion ? 0 : 200,
		easing: (t: number) => 1 - Math.pow(1 - t, 3)
	});
	const fadeOut = $derived({ duration: reduceMotion ? 0 : 120 });

	/* Glyph shown on the collapsed pill — the mode's primary affordance. */
	const PillIcon = $derived(
		mode === 'reader' ? Reply : (activeMobileNavItem(pathname)?.icon ?? Mail)
	);

	/* The island is always mounted (md:hidden via CSS), so gate the scroll
	   engine on the same breakpoint and detach when the viewport widens. */
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
		void mode;
		mobileIsland.expand();
	});

	/* Apps overlay is a temporary peek; fall back to context tabs. */
	$effect(() => {
		if (!mobileIsland.appsOverlay) return;
		const timeout = setTimeout(() => (mobileIsland.appsOverlay = false), 6000);
		return () => clearTimeout(timeout);
	});

	afterNavigate(() => {
		mobileIsland.expand();
		mobileIsland.appsOverlay = false;
	});

	let positionerEl = $state<HTMLDivElement | null>(null);

	/* On-screen keyboard: where `position: fixed` anchors to the layout
	   viewport (iOS Safari), ride above the keyboard via visualViewport.
	   Where the viewport itself resizes (most Android), offset stays ~0. */
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

<div class="z-mobile-island-positioner md:hidden" bind:this={positionerEl}>
	<div
		class={cn(
			'z-mobile-island',
			wide && 'z-mobile-island--wide',
			collapsed && 'z-mobile-island--collapsed'
		)}
	>
		{#key mode}
			<div class="z-mobile-island__content" inert={collapsed} in:fly={flyIn} out:fade={fadeOut}>
				{#if mode === 'compose'}
					<IslandComposeActions />
				{:else if mode === 'reader'}
					<IslandReaderActions />
				{:else if mode === 'bulk'}
					<IslandBulkActions />
				{:else if mode === 'mail-tabs'}
					<IslandMailTabs />
				{:else}
					<IslandAppNav />
				{/if}
			</div>
		{/key}
		<button
			type="button"
			class="z-mobile-island__pill"
			aria-label="Show navigation"
			aria-expanded={!collapsed}
			inert={!collapsed}
			onclick={() => mobileIsland.expand()}
		>
			<PillIcon class="size-[1.125rem]" aria-hidden="true" />
		</button>
	</div>
</div>
