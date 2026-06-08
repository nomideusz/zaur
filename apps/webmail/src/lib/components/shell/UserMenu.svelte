<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { DropdownMenu } from 'bits-ui';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import LogOut from '$lib/components/icons/LogOut.svelte';
	import Moon from '$lib/components/icons/Moon.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import Sun from '$lib/components/icons/Sun.svelte';
	import User from '$lib/components/icons/User.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		compact = false
	}: {
		compact?: boolean;
	} = $props();

	let open = $state(false);

	const user = $derived({
		name: settings.resolvedDisplayName(auth.displayName ?? auth.username),
		email: auth.username ?? ''
	});
	const onSettingsRoute = $derived($page.url.pathname.startsWith('/settings'));
</script>

<DropdownMenu.Root bind:open>
	<DropdownMenu.Trigger
		class={cn(
			'rounded-md border border-transparent transition-colors hover:border-border/40 hover:bg-surface-sunken/80',
			compact ? 'z-icon-tap-target p-0' : 'flex items-center gap-2 p-1.5'
		)}
		aria-label="Account menu"
		title="Account menu"
	>
		<span
			class={cn(
				'flex items-center justify-center rounded-full bg-surface-sunken text-fg-muted',
				compact ? 'size-9' : 'size-8'
			)}
		>
			<User class="size-4" aria-hidden="true" />
		</span>
		{#if !compact}
			<ChevronDown class="size-4 text-fg-subtle" aria-hidden="true" />
		{/if}
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<DropdownMenu.Content
			side="bottom"
			align="end"
			sideOffset={8}
			collisionPadding={12}
			sticky="always"
			updatePositionStrategy="always"
			class="z-overflow-menu z-overflow-menu--fixed z-overflow-menu--list w-56 min-w-56 max-w-[calc(100vw-1rem)]"
		>
			<div class="border-b border-border px-3 py-2">
				<p class="truncate text-sm font-medium text-fg">
					{user.name}
				</p>
				<p class="truncate text-xs text-fg-muted">{user.email}</p>
			</div>

			<DropdownMenu.Item
				class={cn('z-overflow-menu-item', onSettingsRoute && 'z-surface-active')}
				textValue="Settings"
				onSelect={() => goto('/settings/account')}
			>
				<span class="flex size-5 shrink-0 items-center justify-center">
					<Settings class="size-4 text-fg-muted" aria-hidden="true" />
				</span>
				<span class="truncate">Settings</span>
			</DropdownMenu.Item>

			<DropdownMenu.Item
				class="z-overflow-menu-item"
				textValue={theme.resolved === 'dark' ? 'Light mode' : 'Dark mode'}
				onSelect={() => {
					theme.toggle();
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
			</DropdownMenu.Item>

			<DropdownMenu.Item
				class="z-overflow-menu-item"
				textValue="Sign out"
				onSelect={() => auth.logout()}
			>
				<span class="flex size-5 shrink-0 items-center justify-center">
					<LogOut class="size-4 text-fg-muted" aria-hidden="true" />
				</span>
				<span class="truncate">Sign out</span>
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
