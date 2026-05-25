<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronDown, LogOut, Moon, Settings, Sun, User } from 'lucide-svelte';
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

	function close() {
		open = false;
	}
</script>

<svelte:window onclick={close} />

<div class="relative">
	<button
		type="button"
		class={cn(
			'flex items-center rounded-md transition-colors hover:bg-surface-sunken',
			settings.compactUserMenu ? 'p-1' : 'gap-2 p-1.5'
		)}
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
		{#if !settings.compactUserMenu}
			<ChevronDown class="size-4 text-fg-subtle" aria-hidden="true" />
		{/if}
	</button>

	{#if open}
		<div
			role="menu"
			tabindex="-1"
			class="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface-raised py-1 shadow-md"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && close()}
		>
			<div class={cn('px-3', !settings.hidePaneBorders && 'border-b border-border', settings.compactUserMenuDropdown ? 'py-1.5' : 'py-2')}>
				<p class={cn('truncate font-medium text-fg', settings.compactUserMenuDropdown ? 'text-xs' : 'text-sm')}>{user.name}</p>
				<p class="truncate text-xs text-fg-muted">{user.email}</p>
			</div>

			<a
				href="/settings/account"
				role="menuitem"
				class={cn(
					'flex items-center gap-2 px-3 text-sm text-fg hover:bg-surface-sunken',
					settings.compactUserMenuDropdown ? 'py-1.5' : 'py-2',
					$page.url.pathname.startsWith('/settings/account') && 'bg-surface-sunken'
				)}
				onclick={close}
			>
				<User class="size-4 text-fg-muted" />
				Account
			</a>

			<a
				href="/settings/appearance"
				role="menuitem"
				class={cn(
					'flex items-center gap-2 px-3 text-sm text-fg hover:bg-surface-sunken',
					settings.compactUserMenuDropdown ? 'py-1.5' : 'py-2',
					$page.url.pathname.startsWith('/settings') && 'bg-surface-sunken'
				)}
				onclick={close}
			>
				<Settings class="size-4 text-fg-muted" />
				Settings
			</a>

			<button
				type="button"
				role="menuitem"
				class={cn(
					'flex w-full items-center gap-2 px-3 text-left text-sm text-fg hover:bg-surface-sunken',
					settings.compactUserMenuDropdown ? 'py-1.5' : 'py-2'
				)}
				onclick={() => {
					theme.toggle();
					close();
				}}
			>
				{#if theme.resolved === 'dark'}
					<Sun class="size-4 text-fg-muted" />
					Light mode
				{:else}
					<Moon class="size-4 text-fg-muted" />
					Dark mode
				{/if}
			</button>

			{#if !settings.hidePaneBorders}
				<hr class="my-1 border-border" />
			{/if}

			<button
				type="button"
				role="menuitem"
				class={cn(
					'flex w-full items-center gap-2 px-3 text-left text-sm text-fg hover:bg-surface-sunken',
					settings.compactUserMenuDropdown ? 'py-1.5' : 'py-2'
				)}
				onclick={() => auth.logout()}
			>
				<LogOut class="size-4 text-fg-muted" />
				Sign out
			</button>
		</div>
	{/if}
</div>
