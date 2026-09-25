<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import SectionShell from '#lib/components/mail/SectionShell.svelte';
	import { SETTINGS_GROUPS, settingsSection } from '#lib/settings/sections';
	import { CHANNELS, channelStyle } from '#lib/mail/colors';
	import { adoptAccountPrefs } from '#lib/settings.svelte.ts';
	import { whoami } from '../../session.remote';
	import { accountPrefs, setAccountPrefs } from '../../settings.remote';

	let { children }: { children: Snippet } = $props();

	const current = $derived(settingsSection(page.url.pathname));
	const isRoot = $derived(current.href === '/settings');

	// Landing straight on a settings page has to adopt the account's copy of the prefs.
	const who = whoami();
	const accountPrefsResource = $derived(who.current ? accountPrefs() : undefined);
	$effect(() => {
		if (!who.current || accountPrefsResource?.loading !== false) return;
		adoptAccountPrefs(accountPrefsResource.current ?? null, (changed) => {
			void setAccountPrefs(changed).catch(() => {});
		});
	});

	const selected = channelStyle(CHANNELS.correspondence);
</script>

<svelte:head><title>{isRoot ? 'Settings' : `${current.label} · Settings`} · Zaur Mail</title></svelte:head>

<SectionShell title="Settings">
	<div class="flex min-h-0 flex-1">
		<!-- The pages, as mail's sidebar lists folders: same column, same rows. -->
		<nav
			class="w-[var(--z-sidebar-width)] shrink-0 overflow-y-auto border-r border-[var(--z-line)] bg-[var(--z-surface)] px-3 py-4 select-none max-md:hidden"
			aria-label="Settings"
		>
			{#each SETTINGS_GROUPS as group, index (group.label)}
				<h2 class="z-caption mb-[9px] px-1.5 {index ? 'mt-5' : ''}">{group.label}</h2>
				<ul class="flex flex-col gap-[3px]" role="list">
					{#each group.items as item (item.href)}
						{@const on = item.href === current.href}
						<li>
							<a
								href={item.href}
								aria-current={on ? 'page' : undefined}
								data-sveltekit-preload-data="hover"
								class="z-railed flex w-full items-center rounded-[8px] border py-[7px] pr-2 pl-[18px] text-[13.5px] transition-[background-color,border-color] duration-[120ms] {on
									? 'z-hue-wash font-semibold text-[var(--z-ink-on)]'
									: 'border-transparent font-medium text-[var(--z-strong)] hover:bg-[var(--z-hover)]'}"
								style="{selected};--z-rail-inset:6px;--z-rail-strength:{on ? '1' : '0'}"
							>
								<span class="min-w-0 truncate">{item.label}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/each}
		</nav>

		<div class="min-h-0 flex-1 overflow-y-auto bg-[var(--z-canvas)]">
			<div class="flex max-w-[720px] flex-col gap-4 px-8 py-7 max-md:px-4 max-md:py-4">
				<!-- On a phone, Account is the settings home: the profile card says what it is. -->
				<header class="flex items-start gap-2.5 {isRoot ? 'max-md:sr-only' : ''}">
					{#if !isRoot}
						<a href="/settings" class="btn-tactile mt-[1px] !size-[30px] shrink-0 !p-0 md:hidden" aria-label="All settings">
							<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</a>
					{/if}
					<div class="min-w-0">
						<h1 class="text-[20px] leading-[30px] font-semibold text-[var(--z-ink)] max-md:text-[18px]">{current.label}</h1>
						<p class="mt-0.5 text-[13px] leading-[1.55] text-[var(--z-muted)]">{current.blurb}</p>
					</div>
				</header>

				{@render children()}

				<!-- A phone has no room for the side list: Account opens with it underneath, one card per group. -->
				{#if isRoot}
					{#each SETTINGS_GROUPS as group (group.label)}
						{@const items = group.items.filter((item) => item.href !== '/settings')}
						<section class="md:hidden" aria-label={group.label}>
							<h2 class="z-caption mb-2 px-1">{group.label}</h2>
							<ul class="z-card divide-y divide-[var(--z-hairline)] overflow-hidden" role="list">
								{#each items as item (item.href)}
									<li>
										<a href={item.href} class="flex min-h-[52px] items-center gap-3 px-4 py-2.5 active:bg-[var(--z-hover)]">
											<span class="min-w-0 flex-1">
												<span class="block text-[15px] font-medium text-[var(--z-ink)]">{item.label}</span>
												<span class="block truncate text-[12.5px] text-[var(--z-soft)]">{item.blurb}</span>
											</span>
											<svg class="size-3.5 shrink-0 text-[var(--z-faint)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
												<path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
											</svg>
										</a>
									</li>
								{/each}
							</ul>
						</section>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</SectionShell>
