<script lang="ts">
	import { goto } from '$app/navigation';
	import { Mail, Search, UserPlus, Users } from 'lucide-svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import ContactDetailEmpty from '$lib/components/contacts/ContactDetailEmpty.svelte';
	import ContactDetailPanel from '$lib/components/contacts/ContactDetailPanel.svelte';
	import ContactLetterRail from '$lib/components/contacts/ContactLetterRail.svelte';
	import ContactsSidebar from '$lib/components/contacts/ContactsSidebar.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
	import { listContacts, recordContact, removeContact, type ContactEntry } from '$lib/utils/contact-index';

	let query = $state('');
	let refresh = $state(0);
	let showAddForm = $state(false);
	let newName = $state('');
	let newEmail = $state('');
	let selectedLetter = $state<string | null>(null);
	let selectedEmail = $state<string | null>(null);

	const allContacts = $derived.by(() => {
		refresh;
		return listContacts(auth.client?.getAccountId() ?? null, query);
	});

	const availableLetters = $derived.by(() => {
		refresh;
		const letters = new Set<string>();
		for (const contact of listContacts(auth.client?.getAccountId() ?? null)) {
			const letter = (contact.name[0] ?? '#').toUpperCase();
			letters.add(/[A-Z]/.test(letter) ? letter : '#');
		}
		return [...letters].sort((a, b) => a.localeCompare(b));
	});

	const contacts = $derived.by(() => {
		if (query.trim() || selectedLetter === null) return allContacts;

		return allContacts.filter((contact) => {
			const letter = (contact.name[0] ?? '#').toUpperCase();
			const key = /[A-Z]/.test(letter) ? letter : '#';
			return key === selectedLetter;
		});
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

	const selectedContact = $derived(
		selectedEmail ? contacts.find((contact) => contact.email === selectedEmail) ?? null : null
	);

	const hideBorders = $derived(settings.hidePaneBorders);
	const listTitle = $derived(
		query.trim()
			? `Search: ${query.trim()}`
			: selectedLetter
				? selectedLetter
				: 'All contacts'
	);

	const showLetterNav = $derived(
		!query.trim() && !settings.hideContactGroupLetters && availableLetters.length > 0
	);

	function selectLetter(letter: string | null) {
		selectedLetter = letter;
		selectedEmail = null;
	}

	function composeTo(email: string) {
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}

	function selectContact(email: string) {
		selectedEmail = email;
	}

	function clearSelection() {
		selectedEmail = null;
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
		selectedEmail = email;
		refresh++;
	}

	function deleteContact(email: string) {
		const accountId = auth.client?.getAccountId();
		if (!accountId || !confirm(`Remove ${email} from contacts?`)) return;
		removeContact(accountId, email);
		if (selectedEmail === email) selectedEmail = null;
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

	$effect(() => {
		query;
		selectedLetter;
		if (selectedEmail && !contacts.some((contact) => contact.email === selectedEmail)) {
			selectedEmail = null;
		}
	});
</script>

<svelte:head>
	<title>Contacts · ZAUR Webmail</title>
</svelte:head>

<div class="hidden md:contents">
	<ContactsSidebar
		totalCount={listContacts(auth.client?.getAccountId() ?? null).length}
		{selectedLetter}
		onSelectLetter={selectLetter}
		onAddContact={() => {
			showAddForm = true;
			selectedEmail = null;
		}}
	/>
</div>

<section
	class={cn(
		'z-panel flex min-h-0 w-full max-w-none flex-1 shrink-0 flex-col md:w-(--width-list) md:max-w-(--width-list)',
		!hideBorders && 'border-r',
		selectedEmail ? 'hidden md:flex' : 'flex'
	)}
	style="view-transition-name: contacts-list;"
	aria-label="Contacts list"
>
	<div
		class={cn(
			'flex shrink-0 flex-wrap items-center justify-between gap-2 px-4',
			settings.compactContactsPage ? 'min-h-10 py-2' : 'min-h-12 py-2.5',
			!hideBorders && 'border-b border-border'
		)}
	>
		<h2 class="z-type-pane-title">{listTitle}</h2>
		<IconButton
			label="Add contact"
			class="md:hidden"
			onclick={() => {
				showAddForm = true;
				selectedEmail = null;
			}}
		>
			<UserPlus class="size-4" aria-hidden="true" />
		</IconButton>
	</div>

	<div
		class={cn(
			'shrink-0 px-4',
			settings.compactContactsPage ? 'py-2' : 'py-3',
			!hideBorders && 'border-b border-border'
		)}
	>
		{#if showAddForm}
			<form
				class={cn(
					'z-panel grid sm:grid-cols-2',
					settings.compactContactsAddForm ? 'mb-2 gap-2 rounded-lg p-3' : 'mb-3 gap-3 rounded-xl p-4'
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
				class={cn('z-input w-full', settings.compactContactsSearch ? 'py-1.5 pl-8' : 'pl-9')}
				placeholder="Search contacts…"
				bind:value={query}
			/>
		</label>

		{#if showLetterNav}
			<ContactLetterRail
				variant="horizontal"
				letters={availableLetters}
				{selectedLetter}
				onSelectLetter={selectLetter}
			/>
		{/if}
	</div>

	<div class="relative min-h-0 flex-1">
		{#if showLetterNav}
			<ContactLetterRail
				letters={availableLetters}
				{selectedLetter}
				onSelectLetter={selectLetter}
			/>
		{/if}

		<div class="z-pane-scroll h-full overflow-y-auto">
		{#if contacts.length}
			<div
				class={cn(
					settings.compactContactsList ? 'space-y-3 p-2' : 'space-y-4 p-3',
					showLetterNav && 'md:pr-12'
				)}
			>
				{#each groupedContacts as [letter, group] (letter)}
					<section>
						{#if !settings.hideContactGroupLetters}
							<h3
								class={cn(
									'sticky top-0 z-[1] mb-1 bg-surface/95 px-2 py-1.5 font-semibold text-fg-muted backdrop-blur-sm',
									settings.compactContactsList ? 'text-xs' : 'text-sm'
								)}
							>
								{letter}
							</h3>
						{/if}
						<ul
							class={cn(
								'z-panel overflow-hidden rounded-xl',
								!hideBorders && 'divide-y divide-border'
							)}
						>
							{#each group as contact (contact.email)}
								<li class="group relative">
									<button
										type="button"
										class={cn(
											'flex w-full items-center gap-3 text-left transition-colors hover:bg-surface-sunken',
											settings.compactContactsList ? 'min-h-11 px-3 py-2.5' : 'min-h-14 px-4 py-3.5',
											selectedEmail === contact.email && 'bg-surface-sunken'
										)}
										onclick={() => selectContact(contact.email)}
									>
										{#if settings.showAvatars}
											<Avatar name={contact.name} email={contact.email} />
										{/if}
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-semibold tracking-tight text-fg">{contact.name}</p>
											{#if !settings.hideContactsEmailLine}
												<p class="truncate text-xs text-fg-muted">{contact.email}</p>
											{/if}
											{#if !settings.hideContactMessageCounts && contact.count > 1}
												<p class="text-[11px] text-fg-subtle">{contact.count} messages</p>
											{/if}
										</div>
										{#if !settings.hideContactsRowMailIcon}
											<Mail class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		{:else}
			<div
				class={cn(
					'flex flex-col items-center text-center',
					settings.compactContactsEmptyState ? 'gap-2 px-4 py-8' : 'gap-3 px-4 py-12'
				)}
			>
				<div
					class={cn(
						'rounded-full bg-surface-sunken',
						settings.compactContactsEmptyState ? 'p-2' : 'p-3'
					)}
				>
					<Users
						class={cn(
							'text-fg-subtle',
							settings.compactContactsEmptyState ? 'size-5' : 'size-6'
						)}
						aria-hidden="true"
					/>
				</div>
				<div>
					<p class={cn('font-medium text-fg', settings.compactContactsEmptyState ? 'text-xs' : 'text-sm')}>
						{#if query.trim()}
							No contacts match your search
						{:else if selectedLetter}
							No contacts under {selectedLetter}
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
						<Button href={settings.preferredMailHref()} variant="ghost">Open mail</Button>
					{/if}
				</div>
			</div>
		{/if}
		</div>
	</div>
</section>

{#if selectedContact}
	<ContactDetailPanel
		contact={selectedContact}
		onClose={clearSelection}
		onCompose={() => composeTo(selectedContact.email)}
		onCopy={() => void copyEmail(selectedContact.email)}
		onRemove={() => deleteContact(selectedContact.email)}
	/>
{:else}
	<ContactDetailEmpty />
{/if}
