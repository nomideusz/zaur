<script lang="ts">
	import { goto } from '$app/navigation';
	import { Mail, Search, UserPlus, Copy, Users } from 'lucide-svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
	import { listContacts, recordContact, removeContact, type ContactEntry } from '$lib/utils/contact-index';

	let query = $state('');
	let refresh = $state(0);
	let showAddForm = $state(false);
	let newName = $state('');
	let newEmail = $state('');

	const contacts = $derived.by(() => {
		refresh;
		return listContacts(auth.client?.getAccountId() ?? null, query);
	});

	const groupedContacts = $derived.by(() => {
		const groups = new Map<string, ContactEntry[]>();
		for (const contact of contacts) {
			const letter = (contact.name[0] ?? '#').toUpperCase();
			const key = /[A-Z]/.test(letter) ? letter : '#';
			const list = groups.get(key) ?? [];
			list.push(contact);
			groups.set(key, list);
		}
		return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
	});

	function composeTo(email: string) {
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}

	function addContact(event: Event) {
		event.preventDefault();
		const accountId = auth.client?.getAccountId();
		const email = newEmail.trim();
		const name = newName.trim() || email;
		if (!accountId || !email) return;

		recordContact(accountId, name, email);
		newName = '';
		newEmail = '';
		showAddForm = false;
		refresh++;
	}

	function deleteContact(email: string) {
		const accountId = auth.client?.getAccountId();
		if (!accountId || !confirm(`Remove ${email} from contacts?`)) return;
		removeContact(accountId, email);
		refresh++;
	}

	async function copyEmail(email: string) {
		try {
			await navigator.clipboard.writeText(email);
			toast.show('Email copied', 'success');
		} catch {
			toast.show('Could not copy email', 'error');
		}
	}
</script>

<svelte:head>
	<title>Contacts · ZAUR Webmail</title>
</svelte:head>

<div
	class={cn(
		'mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto',
		settings.compactContactsPage ? 'gap-3 p-4 md:p-6' : 'gap-4 p-6 md:p-8'
	)}
>
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class={cn('font-semibold text-fg', settings.compactContactsPage ? 'text-lg' : 'text-xl')}>
				Contacts
			</h1>
			{#if !settings.hideContactsPageSubtitle && !settings.compactContactsPage}
				<p class="mt-1 text-sm text-fg-muted">
					People you've mailed with, plus any you add manually.
				</p>
			{/if}
		</div>
		<div class="flex gap-2">
			{#if !settings.hideContactsHeaderSettings}
				<Button variant="ghost" href="/settings/display">Settings</Button>
			{/if}
			<Button variant="ghost" onclick={() => (showAddForm = !showAddForm)}>
				<UserPlus class="size-4" aria-hidden="true" />
				Add contact
			</Button>
			{#if !settings.hideContactsComposeButton}
				<Button href="/mail/compose">New message</Button>
			{/if}
		</div>
	</header>

	{#if showAddForm}
		<form
			class={cn(
				'z-panel grid sm:grid-cols-2',
				settings.compactContactsAddForm ? 'gap-2 rounded-lg p-3' : 'gap-3 rounded-xl p-4'
			)}
			onsubmit={addContact}
		>
			<label class={cn('block', settings.compactContactsAddForm ? 'text-xs' : 'text-sm')}>
				<span class={cn('block text-fg-muted', settings.compactContactsAddForm ? 'mb-0.5' : 'mb-1')}>
					Name
				</span>
				<input type="text" class="z-input" placeholder="Jane Doe" bind:value={newName} />
			</label>
			<label class={cn('block', settings.compactContactsAddForm ? 'text-xs' : 'text-sm')}>
				<span class={cn('block text-fg-muted', settings.compactContactsAddForm ? 'mb-0.5' : 'mb-1')}>
					Email
				</span>
				<input
					type="email"
					class="z-input"
					placeholder="jane@example.com"
					bind:value={newEmail}
					required
				/>
			</label>
			<div class="flex gap-2 sm:col-span-2">
				<Button type="submit">Save contact</Button>
				<Button type="button" variant="ghost" onclick={() => (showAddForm = false)}>Cancel</Button>
			</div>
		</form>
	{/if}

	<label class="relative block">
		<Search
			class={cn(
				'pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-subtle',
				settings.compactContactsSearch ? 'left-2.5 size-3.5' : 'left-3 size-4'
			)}
		/>
		<input
			type="search"
			class={cn(
				'z-input',
				settings.compactContactsSearch ? 'py-1.5 pl-8 text-xs' : 'pl-9'
			)}
			placeholder="Search contacts…"
			bind:value={query}
		/>
	</label>

	{#if contacts.length}
		<div class={cn(settings.compactContactsList ? 'space-y-3' : 'space-y-4')}>
			{#each groupedContacts as [letter, group] (letter)}
				<section>
					{#if !settings.hideContactGroupLetters}
						<h2 class="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
							{letter}
						</h2>
					{/if}
					<ul
						class={cn(
							'z-panel overflow-hidden rounded-xl',
							!settings.hidePaneBorders && 'divide-y divide-border'
						)}
					>
						{#each group as contact (contact.email)}
							<li class="group relative">
								<button
									type="button"
									class={cn(
										'flex w-full items-center gap-3 text-left transition-colors hover:bg-surface-sunken',
										settings.compactContactsList ? 'px-3 py-2' : 'px-4 py-3'
									)}
									onclick={() => composeTo(contact.email)}
								>
									{#if settings.showAvatars}
										<Avatar name={contact.name} email={contact.email} />
									{/if}
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-fg">{contact.name}</p>
										<p class="truncate text-xs text-fg-muted">{contact.email}</p>
										{#if !settings.hideContactMessageCounts && contact.count > 1}
											<p class="text-[11px] text-fg-subtle">{contact.count} messages</p>
										{/if}
									</div>
									{#if !settings.hideContactsRowMailIcon}
										<Mail class="size-4 shrink-0 text-fg-subtle group-hover:hidden" aria-hidden="true" />
									{/if}
								</button>
								{#if !settings.hideContactsHoverActions}
								<div
									class="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 group-hover:flex"
								>
									<button
										type="button"
										class="rounded p-1 text-fg-subtle hover:bg-surface-sunken hover:text-fg"
										title="Copy email"
										aria-label="Copy {contact.email}"
										onclick={(e) => {
											e.stopPropagation();
											void copyEmail(contact.email);
										}}
									>
										<Copy class="size-3.5" aria-hidden="true" />
									</button>
									<button
										type="button"
										class="rounded px-2 py-1 text-xs text-danger hover:bg-danger/10"
										onclick={(e) => {
											e.stopPropagation();
											deleteContact(contact.email);
										}}
									>
										Remove
									</button>
								</div>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{:else}
		<div
			class={cn(
				'z-panel flex flex-col items-center rounded-xl text-center',
				settings.compactContactsEmptyState
					? 'gap-2 px-4 py-8'
					: settings.compactContactsPage
						? 'gap-3 px-4 py-10'
						: 'gap-4 px-6 py-16'
			)}
		>
			<div
				class={cn(
					'rounded-full bg-surface-sunken',
					settings.compactContactsEmptyState ? 'p-2' : settings.compactContactsPage ? 'p-3' : 'p-4'
				)}
			>
				<Users
					class={cn(
						'text-fg-subtle',
						settings.compactContactsEmptyState
							? 'size-5'
							: settings.compactContactsPage
								? 'size-6'
								: 'size-8'
					)}
					aria-hidden="true"
				/>
			</div>
			<div>
				<p class={cn('font-medium text-fg', settings.compactContactsEmptyState ? 'text-xs' : 'text-sm')}>
					{#if query.trim()}
						No contacts match your search
					{:else}
						No contacts yet
					{/if}
				</p>
				{#if !settings.hideContactsEmptyHints}
					<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">
						{#if query.trim()}
							Try a different name or email address.
						{:else}
							Contacts appear as you send and receive mail, or add someone manually.
						{/if}
					</p>
				{/if}
			</div>
			<div class="flex flex-wrap justify-center gap-2">
				{#if !settings.hideContactsEmptyActions}
					<Button variant="ghost" onclick={() => (showAddForm = true)}>Add contact</Button>
					<Button href="/mail/inbox" variant="ghost">Go to inbox</Button>
				{/if}
			</div>
		</div>
	{/if}
</div>
