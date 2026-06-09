<script lang="ts">
	import Search from '$lib/components/icons/Search.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { cn } from '$lib/utils/cn';

	const contactsNav = $derived(shellHeader.page?.contactsNav);

	function navLinkClass(active: boolean): string {
		return cn('z-mail-text-nav__link shrink-0', active && 'z-mail-text-nav__link--active');
	}

	const allActive = $derived(
		!!contactsNav && contactsNav.selectedLetter === null && !contactsNav.query.trim()
	);
</script>

{#if contactsNav}
	<nav
		class="flex min-w-0 items-center gap-3 md:hidden"
		aria-label="Contacts navigation"
	>
		<button
			type="button"
			class={navLinkClass(allActive)}
			aria-current={allActive ? 'page' : undefined}
			onclick={contactsNav.onShowAll}
		>
			All
		</button>
		<OverflowMenu
			label="More contact filters"
			menuId="mobile-contacts-more-menu"
			textTrigger
			triggerText="More"
			triggerClass="z-mail-text-nav__link"
		>
			<OverflowMenuItem label="Search contacts" onclick={contactsNav.onFocusSearch}>
				{#snippet icon()}
					<Search class="size-5" aria-hidden="true" />
				{/snippet}
			</OverflowMenuItem>
			{#if contactsNav.letters.length > 0}
				<div class="mx-4 my-1 border-t border-border" role="separator"></div>
				<OverflowMenuItem label="All contacts" onclick={contactsNav.onShowAll} />
				{#each contactsNav.letters as letter (letter)}
					<OverflowMenuItem
						label={letter}
						onclick={() => contactsNav.onSelectLetter(letter)}
					/>
				{/each}
			{/if}
		</OverflowMenu>
	</nav>
{/if}
