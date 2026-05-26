<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import AppSidebarShortcuts from '$lib/components/shell/AppSidebarShortcuts.svelte';
	import GlobalSearch from '$lib/components/shell/GlobalSearch.svelte';
	import MailboxTreeItem from './MailboxTreeItem.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { buildMailboxTree } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	const tree = $derived(buildMailboxTree(mail.mailboxes));
</script>

<aside
	class={cn(
		'z-mail-pane-surface hidden min-h-0 w-(--width-sidebar) shrink-0 flex-col md:flex',
		!settings.hidePaneBorders && 'border-r border-border'
	)}
	style="view-transition-name: mail-sidebar;"
	aria-label="Folders"
>
	<div
		class={cn(
			'relative z-20 shrink-0',
			settings.compactFolderSidebarHeader ? 'px-3 py-2' : 'px-3 py-3',
			!settings.hidePaneBorders && 'border-b border-border/80'
		)}
	>
		<GlobalSearch placement="sidebar" />
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

	<AppSidebarShortcuts />
</aside>
