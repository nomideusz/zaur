<script lang="ts">
	import { page } from '$app/stores';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
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
	class="flex w-full min-w-0 items-center justify-between gap-3 md:hidden"
	aria-label="Settings navigation"
>
	<a href={backHref} class="z-mail-text-nav__link shrink-0">
		Back
	</a>

	<SegmentGroupScroll activeValue={activeHref} class="min-w-0">
		<SegmentGroup
			value={activeHref}
			track={false}
			indicatorClass="z-segment-group__indicator--accent rounded-md"
			class="rounded-lg px-0.5"
		>
			{#each navLinks as link (link.href)}
				<SegmentGroupItem
					value={link.href}
					href={link.href}
					class="px-2.5 py-1.5 text-sm font-medium text-fg-muted data-[state=checked]:font-semibold data-[state=checked]:text-fg"
				>
					<SegmentGroupItemText>{link.label}</SegmentGroupItemText>
				</SegmentGroupItem>
			{/each}
		</SegmentGroup>
	</SegmentGroupScroll>
</nav>
