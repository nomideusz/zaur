<script lang="ts">
	import Search from '$lib/components/icons/Search.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText
	} from '$lib/components/ui/segment-group';
	import {
		MOBILE_RAIL_GROUP_CLASS,
		MOBILE_RAIL_INDICATOR_CLASS,
		MOBILE_RAIL_ITEM_CLASS
	} from '$lib/shell/mobile-rail';

	const contactsNav = $derived(shellHeader.page?.contactsNav);

	const allActive = $derived(
		!!contactsNav && contactsNav.selectedLetter === null && !contactsNav.query.trim()
	);
	const activeValue = $derived(
		allActive ? 'all' : (contactsNav?.selectedLetter ?? undefined)
	);

</script>

{#if contactsNav}
	{@const nav = contactsNav}
	<nav
		class="flex min-w-0 items-center gap-1 md:hidden"
		aria-label="Contacts navigation"
	>
		<SegmentGroup
			value={activeValue}
			track={false}
			indicatorClass={MOBILE_RAIL_INDICATOR_CLASS}
			class={MOBILE_RAIL_GROUP_CLASS}
			onValueChange={(value) => {
				if (value === 'all') nav.onShowAll();
				else nav.onSelectLetter(value);
			}}
		>
			<SegmentGroupItem value="all" class={MOBILE_RAIL_ITEM_CLASS}>
				<SegmentGroupItemText>All</SegmentGroupItemText>
			</SegmentGroupItem>
			{#if nav.selectedLetter}
				<SegmentGroupItem value={nav.selectedLetter} class={MOBILE_RAIL_ITEM_CLASS}>
					<SegmentGroupItemText>{nav.selectedLetter}</SegmentGroupItemText>
				</SegmentGroupItem>
			{/if}
		</SegmentGroup>
		<OverflowMenu
			label="More contact filters"
			menuId="mobile-contacts-more-menu"
			textTrigger
			triggerText="More"
			triggerClass="px-2.5 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
		>
			<OverflowMenuItem label="Search contacts" onclick={nav.onFocusSearch}>
				{#snippet icon()}
					<Search class="size-5" aria-hidden="true" />
				{/snippet}
			</OverflowMenuItem>
			{#if nav.letters.length > 0}
				<div class="mx-4 my-1 border-t border-border" role="separator"></div>
				<OverflowMenuItem label="All contacts" onclick={nav.onShowAll} />
				{#each nav.letters as letter (letter)}
					<OverflowMenuItem
						label={letter}
						onclick={() => nav.onSelectLetter(letter)}
					/>
				{/each}
			{/if}
		</OverflowMenu>
	</nav>
{/if}
