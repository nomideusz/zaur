<script lang="ts">
	import { page } from '$app/stores';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import {
		MOBILE_RAIL_GROUP_CLASS,
		MOBILE_RAIL_INDICATOR_CLASS,
		MOBILE_RAIL_ITEM_CLASS
	} from '$lib/shell/mobile-rail';
	import { settings } from '$lib/stores/settings.svelte';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText,
		SegmentGroupScroll
	} from '$lib/components/ui/segment-group';

	const navLinks = $derived(settingsNavLinks('mobile'));
	const pathname = $derived($page.url.pathname);
	const backHref = $derived(settings.preferredMailHref());
	const activeHref = $derived(
		navLinks.find((link) => isSettingsNavActive(pathname, link.href))?.href
	);
</script>

<nav
	class="flex w-full min-w-0 items-center gap-2 md:hidden"
	aria-label="Settings navigation"
>
	<a href={backHref} class="z-back-btn no-underline" aria-label="Back to mail">
		<ArrowLeft class="size-5" aria-hidden="true" />
	</a>

	<SegmentGroupScroll activeValue={activeHref} class="min-w-0 flex-1">
		<SegmentGroup
			value={activeHref}
			track={false}
			indicatorClass={MOBILE_RAIL_INDICATOR_CLASS}
			class={MOBILE_RAIL_GROUP_CLASS}
		>
			{#each navLinks as link (link.href)}
				<SegmentGroupItem value={link.href} href={link.href} class={MOBILE_RAIL_ITEM_CLASS}>
					<SegmentGroupItemText>{link.label}</SegmentGroupItemText>
				</SegmentGroupItem>
			{/each}
		</SegmentGroup>
	</SegmentGroupScroll>
</nav>
