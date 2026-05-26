<script lang="ts">
	import { Settings, Users } from 'lucide-svelte';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import MailboxTreeItem from './MailboxTreeItem.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { buildMailboxTree } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	const tree = $derived(buildMailboxTree(mail.mailboxes));
</script>

<aside
	class={cn(
		'm-3 mr-0 hidden min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden rounded-lg bg-surface-raised/90 shadow-sm md:flex',
		!settings.hidePaneBorders && 'border border-border'
	)}
	style="view-transition-name: mail-sidebar;"
	aria-label="Folders"
>
	<div
		class={cn(
			'shrink-0',
			settings.compactFolderSidebarHeader ? 'px-3 py-2' : 'px-4 py-3',
			!settings.hidePaneBorders && 'border-b border-border/80',
			settings.hideFolderSidebarHeader ? 'sr-only' : ''
		)}
	>
		<h2 class="z-type-label">Folders</h2>
	</div>

	<nav class="z-pane-scroll min-h-0 flex-1 overflow-y-auto {settings.compactFolderSidebar ? 'p-1.5' : 'p-2.5'}">
		{#if mail.mailboxesLoading}
			{#if settings.loadingIndicatorStyle === 'skeleton'}
			<div
				class={cn(
					'px-3',
					settings.compactFolderLoadingSkeleton ? 'space-y-1.5 py-1.5' : 'space-y-2 py-2'
				)}
				aria-busy="true"
				aria-label="Loading folders"
			>
				{#each Array(settings.compactFolderLoadingSkeleton ? 4 : 6) as _, index (index)}
					<div
						class={cn(
							'animate-pulse rounded-md bg-surface-sunken',
							settings.compactFolderLoadingSkeleton ? 'h-7' : 'h-8'
						)}
					></div>
				{/each}
			</div>
			{:else}
				<LoadingIndicator label="Loading folders…" compact />
			{/if}
		{:else if mail.mailboxesError}
			<div
				class={cn(
					'flex flex-col items-center text-center',
					settings.compactFolderSidebarError ? 'gap-1 px-2 py-2' : 'gap-2 px-3 py-4'
				)}
			>
				<p class={cn('text-danger', settings.compactFolderSidebarError ? 'text-xs' : 'text-sm')}>
					{mail.mailboxesError}
				</p>
				{#if auth.client}
					<Button
						variant="ghost"
						class={settings.compactFolderSidebarError ? 'text-xs' : 'text-sm'}
						onclick={() => void mail.loadMailboxes(auth.client!)}
					>
						Try again
					</Button>
				{/if}
			</div>
		{:else}
			<ul class="space-y-0.5">
				{#each tree as node (node.id)}
					<MailboxTreeItem {node} />
				{/each}
			</ul>
		{/if}
	</nav>

	{#if !settings.hideSidebarShortcuts}
		<div
			class={cn(
				'shrink-0 space-y-0.5',
				!settings.hidePaneBorders && 'border-t border-border/80',
				settings.compactFolderSidebar ? 'p-1.5' : settings.compactSidebarShortcuts ? 'p-2' : 'p-2.5'
			)}
		>
		<a
			href="/contacts"
			aria-current={$page.url.pathname.startsWith('/contacts') ? 'page' : undefined}
			class={cn(
				'flex items-center gap-2 rounded-md px-3 text-sm transition-colors',
				settings.compactSidebarShortcuts ? 'py-1.5' : 'py-2',
				$page.url.pathname.startsWith('/contacts')
					? 'bg-surface-sunken font-medium text-fg'
					: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
			)}
		>
			<Users class="size-4 shrink-0" aria-hidden="true" />
			Contacts
		</a>
		<a
			href="/settings/appearance"
			aria-current={$page.url.pathname.startsWith('/settings') ? 'page' : undefined}
			class={cn(
				'flex items-center gap-2 rounded-md px-3 text-sm transition-colors',
				settings.compactSidebarShortcuts ? 'py-1.5' : 'py-2',
				$page.url.pathname.startsWith('/settings')
					? 'bg-surface-sunken font-medium text-fg'
					: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
			)}
		>
			<Settings class="size-4 shrink-0" aria-hidden="true" />
			Settings
		</a>
		</div>
	{/if}
</aside>
