<script lang="ts">
	import { page } from '$app/stores';
	import Archive from '$lib/components/icons/Archive.svelte';
import FileText from '$lib/components/icons/FileText.svelte';
import Inbox from '$lib/components/icons/Inbox.svelte';
import Send from '$lib/components/icons/Send.svelte';
import ShieldAlert from '$lib/components/icons/ShieldAlert.svelte';
import Trash2 from '$lib/components/icons/Trash2.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Self from './MailboxTreeItem.svelte';
	import type { MailboxNode } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';
	import type { MailboxRole } from '$lib/types/mail';

	interface Props {
		node: MailboxNode;
		depth?: number;
	}

	let { node, depth = 0 }: Props = $props();

	const icons: Record<MailboxRole, typeof Inbox> = {
		inbox: Inbox,
		drafts: FileText,
		sent: Send,
		junk: ShieldAlert,
		trash: Trash2,
		archive: Archive,
		custom: FileText
	};

	const Icon = $derived(icons[node.role ?? 'custom']);
	const href = $derived(`/mail/${node.id}`);
	const isActive = $derived($page.url.pathname.startsWith(href));

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
			'flex items-center gap-2.5 rounded-sm text-sm transition-colors',
			settings.compactFolderSidebar ? 'py-1.5' : 'py-2',
			isActive ? 'z-surface-active' : 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
		)}
		style="padding-left: {0.75 + depth * (settings.compactFolderTree ? 0.5 : 0.75)}rem; padding-right: 0.75rem;"
		aria-current={isActive ? 'page' : undefined}
		onkeydown={onFolderKeydown}
	>
		{#if !settings.hideFolderIcons}
			<Icon class="size-4 shrink-0" aria-hidden="true" />
		{/if}
		<span class="flex-1 truncate">{node.name}</span>
		{#if settings.showFolderUnreadCounts}
			<Badge count={node.role === 'drafts' ? node.total : node.unread} />
		{/if}
	</a>

	{#if node.children.length}
		<ul class={settings.compactFolderTree ? 'space-y-0' : 'space-y-0.5'}>
			{#each node.children as child (child.id)}
				<Self node={child} depth={depth + 1} />
			{/each}
		</ul>
	{/if}
</li>
