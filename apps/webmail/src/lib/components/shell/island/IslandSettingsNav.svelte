<script lang="ts">
	import { page } from '$app/stores';
	import Menu from '$lib/components/icons/Menu.svelte';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText,
		SegmentGroupScroll
	} from '$lib/components/ui/segment-group';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import {
		ISLAND_RAIL_ITEM_CLASS,
		MOBILE_RAIL_GROUP_CLASS,
		MOBILE_RAIL_INDICATOR_CLASS
	} from '$lib/shell/mobile-rail';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	/* Settings island — the section's category navigation lives here (mirroring the
	   mail island's view tabs), so the page top can be just the search bar. */

	const navLinks = $derived(settingsNavLinks('mobile'));
	const pathname = $derived($page.url.pathname);
	const activeHref = $derived(
		navLinks.find((link) => isSettingsNavActive(pathname, link.href))?.href
	);
</script>

<div class="z-mobile-island__tabs">
	<button
		type="button"
		class="z-mobile-island__icon-btn"
		aria-label="Apps and folders"
		aria-expanded={mobileIsland.navDrawerOpen}
		onclick={() => mobileIsland.openNavDrawer()}
	>
		<Menu class="size-[1.125rem]" aria-hidden="true" />
	</button>

	<nav class="min-w-0 flex-1" aria-label="Settings sections">
		<SegmentGroupScroll activeValue={activeHref} class="w-full">
			<SegmentGroup
				value={activeHref}
				track={false}
				indicatorClass={MOBILE_RAIL_INDICATOR_CLASS}
				class={MOBILE_RAIL_GROUP_CLASS}
			>
				{#each navLinks as link (link.href)}
					<SegmentGroupItem value={link.href} href={link.href} class={ISLAND_RAIL_ITEM_CLASS}>
						<SegmentGroupItemText>{link.label}</SegmentGroupItemText>
					</SegmentGroupItem>
				{/each}
			</SegmentGroup>
		</SegmentGroupScroll>
	</nav>

	<div class="size-11 shrink-0" aria-hidden="true"></div>
</div>
