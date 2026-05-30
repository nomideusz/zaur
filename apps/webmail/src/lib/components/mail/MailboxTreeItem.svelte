<script lang="ts">
	import { page } from '$app/stores';
	import Self from './MailboxTreeItem.svelte';
	import type { MailboxNode } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		node: MailboxNode;
		depth?: number;
	}

	let { node, depth = 0 }: Props = $props();
	const href = $derived(`/mail/${node.id}`);
	const isActive = $derived($page.url.pathname.startsWith(href));
	const unreadCount = $derived(node.role === 'drafts' ? node.total : node.unread);

	function onFolderKeydown(event: KeyboardEvent) {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		const current = event.currentTarget as HTMLAnchorElement;
		const links = Array.from(
			current.closest('nav')?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []
		);
		const index = links.indexOf(current);
		if (index < 0) return;
		event.preventDefault();
		const nextIndex =
			event.key === 'ArrowDown'
				? Math.min(index + 1, links.length - 1)
				: Math.max(index - 1, 0);
		links[nextIndex]?.focus();
	}
</script>

<li>
	<a
		{href}
		class={cn(
			'flex items-center gap-2 rounded-sm text-sm transition-colors',
			'py-1.5',
			isActive ? 'z-surface-active' : 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
		)}
		style="padding-left: {0.75 + depth * 0.625}rem; padding-right: 0.75rem;"
		aria-current={isActive ? 'page' : undefined}
		onkeydown={onFolderKeydown}
	>
		<span class="flex-1 truncate">{node.name}</span>
		{#if settings.showFolderUnreadCounts && unreadCount > 0}
			<span class={cn('shrink-0 text-xs tabular-nums text-fg-subtle', isActive && 'text-fg-muted')}>
				{unreadCount}
			</span>
		{/if}
	</a>

	{#if node.children.length}
		<ul class="space-y-0.5">
			{#each node.children as child (child.id)}
				<Self node={child} depth={depth + 1} />
			{/each}
		</ul>
	{/if}
</li>
