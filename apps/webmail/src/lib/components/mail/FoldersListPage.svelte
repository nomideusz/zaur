<script lang="ts">
	import { page } from '$app/stores';
	import Inbox from '$lib/components/icons/Inbox.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import Send from '$lib/components/icons/Send.svelte';
	import Archive from '$lib/components/icons/Archive.svelte';
	import AlertCircle from '$lib/components/icons/AlertCircle.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import LogOut from '$lib/components/icons/LogOut.svelte';
	
	import { mail } from '$lib/stores/mail.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { mailListHref } from '$lib/mail/routes';

	const primaryOrder = new Map([
		['inbox', { rank: 0, icon: Inbox }],
		['drafts', { rank: 1, icon: Pencil }],
		['sent', { rank: 2, icon: Send }],
		['archive', { rank: 3, icon: Archive }],
		['junk', { rank: 4, icon: AlertCircle }],
		['trash', { rank: 5, icon: Trash2 }]
	]);

	const primaryItems = $derived.by(() => {
		return [...mail.mailboxes]
			.filter((mb) => primaryOrder.has(mb.role ?? ''))
			.sort((a, b) => {
				const aRank = primaryOrder.get(a.role ?? '')?.rank ?? 99;
				const bRank = primaryOrder.get(b.role ?? '')?.rank ?? 99;
				return aRank - bRank || a.name.localeCompare(b.name);
			});
	});

	const user = $derived({
		name: settings.resolvedDisplayName(auth.displayName ?? auth.username),
		email: auth.username ?? ''
	});
</script>

<div class="flex flex-col flex-1 h-full bg-surface">
	<header class="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-5">
		<span class="text-xl font-bold tracking-tight text-accent lowercase">zaur</span>
		
		<div class="flex items-center gap-2">
			<a href="/settings" class="flex size-8 items-center justify-center rounded-full bg-surface-sunken text-fg-muted hover:text-fg transition-colors" aria-label="Settings">
				<Settings class="size-4" />
			</a>
		</div>
	</header>

	<nav class="flex-1 overflow-y-auto px-4 py-6">
		<h2 class="px-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle mb-3">Folders</h2>
		<ul class="space-y-1">
			{#each primaryItems as item (item.id)}
				{@const href = mailListHref(item.id)}
				{@const iconData = primaryOrder.get(item.role ?? '')}
				{@const Icon = iconData?.icon ?? Inbox}
				{@const badgeCount = item.role === 'drafts' ? item.total : item.unread}
				<li>
					<a
						{href}
						class="flex min-h-12 w-full items-center justify-between rounded-lg px-3 py-2.5 text-base transition-colors hover:bg-surface-sunken/60 active:bg-surface-sunken"
					>
						<div class="flex items-center gap-3">
							<span class="text-fg-muted">
								<Icon class="size-5" />
							</span>
							<span class="font-medium text-fg">{item.name}</span>
						</div>
						{#if badgeCount > 0}
							<span class="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent">
								{badgeCount}
							</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<footer class="border-t border-border/50 px-5 py-4 flex items-center justify-between shrink-0 bg-surface-raised/50">
		<div class="min-w-0 flex-1 pr-4">
			<p class="truncate text-sm font-semibold text-fg">{user.name}</p>
			<p class="truncate text-xs text-fg-muted">{user.email}</p>
		</div>
		<button
			type="button"
			class="flex size-9 items-center justify-center rounded-md border border-border bg-surface text-fg-muted hover:text-fg hover:bg-surface-sunken transition-colors shrink-0"
			aria-label="Sign out"
			onclick={() => auth.logout()}
		>
			<LogOut class="size-4" />
		</button>
	</footer>
</div>
