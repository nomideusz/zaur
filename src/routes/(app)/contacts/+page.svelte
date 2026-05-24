<script lang="ts">
	import { goto } from '$app/navigation';
	import { Mail, Search, UserPlus } from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { listContacts, type ContactEntry } from '$lib/utils/contact-index';

	let query = $state('');

	const contacts = $derived(
		listContacts(auth.client?.getAccountId() ?? null, query)
	);

	function composeTo(email: string) {
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}
</script>

<svelte:head>
	<title>Contacts · ZAUR Webmail</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6 md:p-8">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold text-fg">Contacts</h1>
			<p class="mt-1 text-sm text-fg-muted">
				People you've mailed with on this device. Full address book sync is coming later.
			</p>
		</div>
		<Button href="/mail/compose" variant="ghost">
			<UserPlus class="size-4" aria-hidden="true" />
			New message
		</Button>
	</header>

	<label class="relative block">
		<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
		<input
			type="search"
			class="z-input pl-9"
			placeholder="Search contacts…"
			bind:value={query}
		/>
	</label>

	{#if contacts.length}
		<ul class="z-panel divide-y divide-border overflow-hidden rounded-xl">
			{#each contacts as contact (contact.email)}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-sunken"
						onclick={() => composeTo(contact.email)}
					>
						<Avatar name={contact.name} email={contact.email} />
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-fg">{contact.name}</p>
							<p class="truncate text-xs text-fg-muted">{contact.email}</p>
						</div>
						<Mail class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="z-panel rounded-xl px-6 py-12 text-center">
			<p class="text-sm text-fg-muted">
				{#if query.trim()}
					No contacts match your search.
				{:else}
					No contacts yet. Open mail and sync a few conversations — addresses will appear here.
				{/if}
			</p>
			<div class="mt-4">
				<Button href="/mail/inbox" variant="ghost">Go to inbox</Button>
			</div>
		</div>
	{/if}
</div>
