<script lang="ts">
	import { page } from '$app/stores';
	import { Archive, FileText, Inbox, LoaderCircle, Send, ShieldAlert, Trash2 } from 'lucide-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';
	import type { MailboxRole } from '$lib/types/mail';

	const icons: Record<MailboxRole, typeof Inbox> = {
		inbox: Inbox,
		drafts: FileText,
		sent: Send,
		junk: ShieldAlert,
		trash: Trash2,
		archive: Archive,
		custom: FileText
	};

	const topLevel = $derived(mail.mailboxes.filter((mb) => !mb.parentId));
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
				{#each topLevel as mailbox (mailbox.id)}
					{@const Icon = icons[mailbox.role ?? 'custom']}
					{@const href = `/mail/${mailbox.id}`}
					{@const isActive = $page.url.pathname.startsWith(href)}
					<li>
						<a
							{href}
							class={cn(
								'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
								isActive
									? 'bg-surface-sunken font-medium text-fg'
									: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
							)}
							aria-current={isActive ? 'page' : undefined}
						>
							<Icon class="size-4 shrink-0" aria-hidden="true" />
							<span class="flex-1 truncate">{mailbox.name}</span>
							<Badge count={mailbox.unread} />
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>
</aside>
