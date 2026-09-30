<script lang="ts">
	import { page } from '$app/state';
	import { identityStyle } from '#lib/mail/colors';
	import { initials } from '#lib/mail/rows';
	import { whoami } from '../../../routes/session.remote';
	import { sectionIcon, sections } from './SectionTabs.svelte';

	/**
	 * The phone's sections, along the bottom edge where the thumb already is:
	 * the same row on every screen, so changing section never goes through the
	 * folder drawer or a menu. Mail wears the mark; Settings wears the signed-in
	 * account's tile, because on a phone the settings home is the account and
	 * switching lives there. The shell leaves the row out while Mail reads a
	 * thread; it also steps aside for the keyboard.
	 */
	const who = whoami();
	const session = $derived(who.current ?? null);
</script>

<nav
	class="z-tabbar grid h-14 shrink-0 grid-cols-5 border-t border-[var(--z-line)] bg-[var(--z-surface)] select-none md:hidden"
	aria-label="Sections"
>
	{#each sections as section (section.href)}
		{@const current = section.match(page.url.pathname)}
		<a
			href={section.href}
			aria-current={current ? 'page' : undefined}
			data-sveltekit-preload-data="hover"
			class="flex flex-col items-center justify-center gap-[3px] text-[12px] leading-[1.3] font-semibold {current
				? 'text-[var(--z-accent-ink)]'
				: 'text-[var(--z-muted)]'}"
			onclick={(event) => {
				// Already there: stay, rather than reload the page or drop what the URL holds.
				if (page.url.pathname === section.href) event.preventDefault();
			}}
		>
			<span class="grid h-7 w-12 place-items-center rounded-full {current ? 'bg-[var(--z-accent-soft)]' : ''}">
				{#if section.href === '/settings' && session}
					<span class="z-avatar !size-6 !text-[11px]" style={identityStyle(session.username)} aria-hidden="true">
						{initials(session.displayName ?? '', session.username)}
					</span>
				{:else}
					{@render sectionIcon(section.href, 'size-[18px]')}
				{/if}
			</span>
			{section.label}
		</a>
	{/each}
</nav>

<style>
	:global(html.z-keyboard-open) .z-tabbar {
		display: none;
	}
</style>
