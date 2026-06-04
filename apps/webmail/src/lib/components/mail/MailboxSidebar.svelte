<script lang="ts">
	import { page } from '$app/stores';
	import AppSidebarShortcuts from '$lib/components/shell/AppSidebarShortcuts.svelte';
	import { parseMailContext, mailListHref } from '$lib/mail/routes';
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';

	const primaryOrder = new Map([
		['inbox', 0],
		['drafts', 1],
		['sent', 2],
		['archive', 3],
		['junk', 4],
		['trash', 5]
	]);

	const primaryItems = $derived.by(() => {
		return [...mail.mailboxes]
			.filter((mb) => primaryOrder.has(mb.role ?? ''))
			.sort((a, b) => {
				const aRank = primaryOrder.get(a.role ?? '') ?? 99;
				const bRank = primaryOrder.get(b.role ?? '') ?? 99;
				return aRank - bRank || a.name.localeCompare(b.name);
			});
	});

	const mailCtx = $derived(parseMailContext($page.url.pathname));
	const currentMailboxRouteId = $derived(mailCtx?.mailboxRouteId ?? null);
</script>

<aside
	class="z-mail-pane-surface hidden min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden border-r border-border md:flex"
	style="view-transition-name: mail-sidebar;"
	aria-label="Mail navigation"
>
	<div class="shrink-0 border-b border-border/80 px-4 py-3">
		<h2 class="z-type-label">Mailboxes</h2>
		<p class="mt-1 text-xs text-fg-muted">{mail.messagesTotal} messages</p>
	</div>

	<nav class="z-pane-scroll min-h-0 flex-1 overflow-y-auto p-2.5">
		<ul class="space-y-0.5">
			{#each primaryItems as item (item.id)}
				{@const href = mailListHref(item.id)}
				{@const isActive = currentMailboxRouteId === item.id}
				{@const badgeCount = item.role === 'drafts' ? item.total : item.unread}
				<li>
					<a
						{href}
						class={cn(
							'flex min-h-10 w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors',
							isActive
								? 'z-surface-active font-semibold'
								: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
						)}
						aria-current={isActive ? 'page' : undefined}
					>
						<span class="truncate">{item.name}</span>
						{#if badgeCount > 0}
							<span class={cn('text-xs tabular-nums text-fg-subtle', isActive && 'text-accent font-semibold')}>
								{badgeCount}
							</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<AppSidebarShortcuts />
</aside>
