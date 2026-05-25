<script lang="ts">
	import { page } from '$app/stores';
	import { Archive, FileText, Inbox, Send, ShieldAlert, Trash2 } from 'lucide-svelte';
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
</script>

<li>
	<a
		{href}
		class={cn(
			'flex items-center gap-2.5 rounded-md py-2 text-sm transition-colors',
			isActive
				? 'bg-surface-sunken font-medium text-fg'
				: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
		)}
		style="padding-left: {0.75 + depth * 0.75}rem; padding-right: 0.75rem;"
		aria-current={isActive ? 'page' : undefined}
	>
		{#if !settings.hideFolderIcons}
			<Icon class="size-4 shrink-0" aria-hidden="true" />
		{/if}
		<span class="flex-1 truncate">{node.name}</span>
		{#if settings.showFolderUnreadCounts}
			<Badge count={node.unread} />
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
