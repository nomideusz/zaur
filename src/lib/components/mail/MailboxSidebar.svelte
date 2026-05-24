<script lang="ts">
	import { LoaderCircle, Users } from 'lucide-svelte';
	import { page } from '$app/stores';
	import MailboxTreeItem from './MailboxTreeItem.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { buildMailboxTree } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';

	const tree = $derived(buildMailboxTree(mail.mailboxes));
</script>

<aside
	class="z-panel flex w-(--width-sidebar) shrink-0 flex-col border-r"
	style="view-transition-name: mail-sidebar;"
	aria-label="Folders"
>
	<div class="border-b border-border px-4 py-3">
		<h2 class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Folders</h2>
	</div>

	<nav class="flex-1 overflow-y-auto p-2">
		{#if mail.mailboxesLoading}
			<div class="flex items-center gap-2 px-3 py-4 text-sm text-fg-muted">
				<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
				Loading folders…
			</div>
		{:else if mail.mailboxesError}
			<p class="px-3 py-4 text-sm text-danger">{mail.mailboxesError}</p>
		{:else}
			<ul class="space-y-0.5">
				{#each tree as node (node.id)}
					<MailboxTreeItem {node} />
				{/each}
			</ul>
		{/if}
	</nav>

	<div class="border-t border-border p-2">
		<a
			href="/contacts"
			class={cn(
				'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
				$page.url.pathname.startsWith('/contacts')
					? 'bg-surface-sunken font-medium text-fg'
					: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
			)}
		>
			<Users class="size-4 shrink-0" aria-hidden="true" />
			Contacts
		</a>
	</div>
</aside>
