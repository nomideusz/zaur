<script lang="ts">
	import { page } from '$app/state';
	import { identityStyle } from '#lib/mail/colors';
	import { initials } from '#lib/mail/rows';
	import { whoami } from '../../../routes/session.remote';
	import { sections } from './SectionTabs.svelte';

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
			class="flex flex-col items-center justify-center gap-[3px] text-[11px] font-semibold {current
				? 'text-[var(--z-accent-ink)]'
				: 'text-[var(--z-muted)]'}"
			onclick={(event) => {
				// Already there: stay, rather than reload the page or drop what the URL holds.
				if (page.url.pathname === section.href) event.preventDefault();
			}}
		>
			<span class="grid h-7 w-12 place-items-center rounded-full {current ? 'bg-[var(--z-accent-soft)]' : ''}">
				{#if section.href === '/settings' && session}
					<span class="z-avatar !size-[22px] !text-[9px]" style={identityStyle(session.username)} aria-hidden="true">
						{initials(session.displayName ?? '', session.username)}
					</span>
				{:else}
					<svg class="size-[18px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<g stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">
							{#if section.href === '/'}
								<path d="M2 4V12M14 4V12M2 4L8 8" stroke-opacity="0.4" />
								<path d="M2 4H14L2 12H14" />
							{:else if section.href === '/contacts'}
								<circle cx="8" cy="5.5" r="2.5" />
								<path d="M3.5 13.5c.6-2.4 2.3-3.5 4.5-3.5s3.9 1.1 4.5 3.5" />
							{:else if section.href === '/calendar'}
								<rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
								<path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
							{:else if section.href === '/files'}
								<path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" />
							{:else}
								<circle cx="8" cy="8" r="2" />
								<path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M3.8 12.2l1-1M11.2 4.8l1-1" />
							{/if}
						</g>
					</svg>
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
