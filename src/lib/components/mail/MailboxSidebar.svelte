<script lang="ts">
	import { Settings, Users } from 'lucide-svelte';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import MailboxTreeItem from './MailboxTreeItem.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { buildMailboxTree } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';

	const tree = $derived(buildMailboxTree(mail.mailboxes));
</script>

<aside
	class="z-panel hidden min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden border-r md:flex"
	style="view-transition-name: mail-sidebar;"
	aria-label="Folders"
>
	<div class="shrink-0 border-b border-border px-4 py-3">
		<h2 class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Folders</h2>
	</div>

	<nav class="z-pane-scroll min-h-0 flex-1 overflow-y-auto p-2">
		{#if mail.mailboxesLoading}
			<div class="space-y-2 px-3 py-2" aria-busy="true" aria-label="Loading folders">
				{#each Array(6) as _, index (index)}
					<div class="h-8 animate-pulse rounded-md bg-surface-sunken"></div>
				{/each}
			</div>
		{:else if mail.mailboxesError}
			<div class="flex flex-col items-center gap-2 px-3 py-4 text-center">
				<p class="text-sm text-danger">{mail.mailboxesError}</p>
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
			<ul class="space-y-0.5">
				{#each tree as node (node.id)}
					<MailboxTreeItem {node} />
				{/each}
			</ul>
		{/if}
	</nav>

	<div class="shrink-0 space-y-0.5 border-t border-border p-2">
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
		<a
			href="/settings/display"
			class={cn(
				'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
				$page.url.pathname.startsWith('/settings')
					? 'bg-surface-sunken font-medium text-fg'
					: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
			)}
		>
			<Settings class="size-4 shrink-0" aria-hidden="true" />
			Settings
		</a>
	</div>
</aside>
