<script lang="ts">
	import { page } from '$app/stores';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import LogOut from '$lib/components/icons/LogOut.svelte';
	import Moon from '$lib/components/icons/Moon.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import Sun from '$lib/components/icons/Sun.svelte';
	import User from '$lib/components/icons/User.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { cn } from '$lib/utils/cn';

	let open = $state(false);

	const user = $derived({
		name: settings.resolvedDisplayName(auth.displayName ?? auth.username),
		email: auth.username ?? ''
	});
	const onSettingsRoute = $derived($page.url.pathname.startsWith('/settings'));

	function close() {
		open = false;
	}
</script>

<svelte:window onclick={close} />

<div class="relative">
	<button
		type="button"
		class="flex items-center gap-2 rounded-sm p-1.5 transition-colors hover:bg-surface-sunken"
		aria-label="Account menu"
		aria-expanded={open}
		aria-haspopup="menu"
		title="Account menu"
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
	>
		{#if settings.showAvatars}
			<Avatar name={user.name} email={user.email} />
		{:else}
			<span class="flex size-8 items-center justify-center rounded-full bg-surface-sunken text-fg-muted">
				<User class="size-4" aria-hidden="true" />
			</span>
		{/if}
		<ChevronDown class="size-4 text-fg-subtle" aria-hidden="true" />
	</button>

	{#if open}
		<div
			role="menu"
			tabindex="-1"
			class="z-overflow-menu z-overflow-menu--list w-56 min-w-0"
			onpointerdown={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && close()}
		>
			<div class="border-b border-border px-3 py-2">
				<p class="truncate text-sm font-medium text-fg">
					{user.name}
				</p>
				<p class="truncate text-xs text-fg-muted">{user.email}</p>
			</div>

			<a
				href="/settings"
				role="menuitem"
				class={cn('z-overflow-menu-item', onSettingsRoute && 'z-surface-active')}
				onclick={close}
			>
				<span class="flex size-5 shrink-0 items-center justify-center">
					<Settings class="size-4 text-fg-muted" aria-hidden="true" />
				</span>
				<span class="truncate">Settings</span>
			</a>

			<button
				type="button"
				role="menuitem"
				class="z-overflow-menu-item"
				onclick={() => {
					theme.toggle();
					close();
				}}
			>
				<span class="flex size-5 shrink-0 items-center justify-center">
					{#if theme.resolved === 'dark'}
						<Sun class="size-4 text-fg-muted" aria-hidden="true" />
					{:else}
						<Moon class="size-4 text-fg-muted" aria-hidden="true" />
					{/if}
				</span>
				<span class="truncate">{theme.resolved === 'dark' ? 'Light mode' : 'Dark mode'}</span>
			</button>

			<button
				type="button"
				role="menuitem"
				class="z-overflow-menu-item"
				onclick={() => auth.logout()}
			>
				<span class="flex size-5 shrink-0 items-center justify-center">
					<LogOut class="size-4 text-fg-muted" aria-hidden="true" />
				</span>
				<span class="truncate">Sign out</span>
			</button>
		</div>
	{/if}
</div>
