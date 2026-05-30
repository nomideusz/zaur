<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import AppSidebarShortcuts from '$lib/components/shell/AppSidebarShortcuts.svelte';
	import OutboxMenu from '$lib/components/shell/OutboxMenu.svelte';
	import MailboxTreeItem from './MailboxTreeItem.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { outbox } from '$lib/stores/outbox.svelte';
	import { buildMailboxTree, type MailboxNode } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	const tree = $derived(buildMailboxTree(mail.mailboxes));
	let showSecondary = $state(false);
	const primaryOrder = new Map([
		['inbox', 0],
		['drafts', 1],
		['sent', 2],
		['archive', 3],
		['junk', 4],
		['trash', 5]
	]);

	function isCoreMailbox(node: MailboxNode): boolean {
		return (
			node.role === 'inbox' ||
			node.role === 'drafts' ||
			node.role === 'sent' ||
			node.role === 'archive' ||
			node.role === 'junk' ||
			node.role === 'trash'
		);
	}

	function treeHasMailbox(node: MailboxNode, routeId: string): boolean {
		if (node.id === routeId) return true;
		return node.children.some((child) => treeHasMailbox(child, routeId));
	}

	const coreNodes = $derived(tree.filter((node) => isCoreMailbox(node)));
	const primaryNodes = $derived(coreNodes.length > 0 ? coreNodes : tree);
	const primaryItems = $derived(
		[...primaryNodes].sort((a, b) => {
			const aRank = primaryOrder.get(a.role ?? '') ?? 99;
			const bRank = primaryOrder.get(b.role ?? '') ?? 99;
			return aRank - bRank || a.name.localeCompare(b.name);
		})
	);
	const secondaryNodes = $derived(
		coreNodes.length > 0 ? tree.filter((node) => !isCoreMailbox(node)) : []
	);
	const activeMailboxRouteId = $derived($page.params.mailbox ?? null);
	const activeInSecondary = $derived.by(() => {
		if (!activeMailboxRouteId) return false;
		return secondaryNodes.some((node) => treeHasMailbox(node, activeMailboxRouteId));
	});
	const showOutbox = $derived(
		!settings.hideOutboxUnlessFailed ||
			outbox.items.some((item) => item.status === 'failed')
	);

	$effect(() => {
		if (activeInSecondary) showSecondary = true;
	});
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
			'px-3 py-3',
			!settings.hidePaneBorders && 'border-b border-border/80'
		)}
	>
		<p class="z-type-label">Mailboxes</p>
	</div>

	<nav class="z-pane-scroll min-h-0 flex-1 overflow-y-auto p-2.5">
		{#if mail.mailboxesLoading}
			<LoadingIndicator label="Loading folders…" compact />
		{:else if mail.mailboxesError}
			<div class="flex flex-col items-center gap-2 px-3 py-4 text-center">
				<p class="text-sm text-danger">
					{mail.mailboxesError}
				</p>
				{#if auth.client}
					<Button
						variant="ghost"
						class="text-sm"
						onclick={() => void mail.loadMailboxes(auth.client!)}
					>
						Try again
					</Button>
				{/if}
			</div>
		{:else}
			<div class="px-1.5 pb-2">
				<p class="z-type-label px-2 pb-1">Views</p>
				<ul class="space-y-1">
					{#each primaryItems as node (node.id)}
						{@const href = `/mail/${node.id}`}
						{@const isActive = $page.url.pathname.startsWith(href)}
						{@const badgeCount = node.role === 'drafts' ? node.total : node.unread}
						<li>
							<a
								{href}
								class={cn(
									'flex items-center gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors',
									isActive
										? 'bg-surface-sunken text-fg'
										: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
								)}
								aria-current={isActive ? 'page' : undefined}
							>
								<span class="flex-1 truncate font-medium">{node.name}</span>
								{#if settings.showFolderUnreadCounts && badgeCount > 0}
									<span class={cn('shrink-0 text-xs tabular-nums text-fg-subtle', isActive && 'text-fg-muted')}>
										{badgeCount}
									</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>

			{#if secondaryNodes.length > 0}
				<div class="px-1.5 pt-2">
					<p class="z-type-label px-2 pb-1">Folders</p>
					<button
						type="button"
						class="z-btn-ghost w-full justify-start text-xs text-fg-muted"
						aria-expanded={showSecondary}
						onclick={() => (showSecondary = !showSecondary)}
					>
						{showSecondary ? 'Hide extra folders' : `More folders (${secondaryNodes.length})`}
					</button>
				</div>
				{#if showSecondary}
					<ul class="space-y-0">
						{#each secondaryNodes as node (node.id)}
							<MailboxTreeItem {node} />
						{/each}
					</ul>
				{/if}
			{/if}
		{/if}
	</nav>

	{#if showOutbox}
		<div class={cn('shrink-0 px-2 pb-2', !settings.hidePaneBorders && 'border-t border-border/80 pt-1.5')}>
			<OutboxMenu display="text" />
		</div>
	{/if}

	<AppSidebarShortcuts />
</aside>
