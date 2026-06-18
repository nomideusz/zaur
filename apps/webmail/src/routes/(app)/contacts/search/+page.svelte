<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Mail from '$lib/components/icons/Mail.svelte';
	import Users from '$lib/components/icons/Users.svelte';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { listContacts } from '$lib/utils/contact-index';

	/* Results for the top search bar's ?q — the bar is the input, this is the list. */
	const query = $derived(page.url.searchParams.get('q')?.trim() ?? '');

	const matches = $derived.by(() =>
		query ? listContacts(auth.client?.getAccountId() ?? null, query) : []
	);

	function openContact(email: string) {
		void goto(`/contacts?email=${encodeURIComponent(email)}`);
	}
</script>

<svelte:head>
	<title>{query ? `${query} · Search` : 'Search'} · Contacts · ZAUR Webmail</title>
</svelte:head>

<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<ScrollArea pane class="min-h-0 flex-1">
		{#if query && matches.length}
			<ul class="divide-y divide-border">
				{#each matches as contact (contact.email)}
					<li>
						<button
							type="button"
							class="z-list-row flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-sunken/60 active:bg-surface-sunken/80"
							onclick={() => openContact(contact.email)}
						>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold tracking-tight text-fg">{contact.name}</p>
								<p class="truncate text-xs text-fg-muted">{contact.email}</p>
								{#if contact.count > 1}
									<p class="text-[11px] text-fg-subtle">{contact.count} messages</p>
								{/if}
							</div>
							<Mail class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="flex flex-col items-center gap-3 px-4 py-12 text-center">
				<div class="rounded-full bg-accent/10 p-3 text-accent">
					<Users class="size-6" aria-hidden="true" />
				</div>
				<div>
					<p class="text-sm font-semibold text-fg">
						{query ? 'No contacts match your search' : 'Search your contacts'}
					</p>
					<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">
						{query ? 'Try a different name or email address.' : 'Find people by name or email.'}
					</p>
				</div>
			</div>
		{/if}
	</ScrollArea>
</div>
