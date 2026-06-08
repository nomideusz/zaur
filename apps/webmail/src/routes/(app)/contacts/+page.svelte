<script lang="ts">
	import { goto } from '$app/navigation';
	import Mail from '$lib/components/icons/Mail.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import UserPlus from '$lib/components/icons/UserPlus.svelte';
	import Users from '$lib/components/icons/Users.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import ContactDetailEmpty from '$lib/components/contacts/ContactDetailEmpty.svelte';
	import ContactDetailPanel from '$lib/components/contacts/ContactDetailPanel.svelte';
	import ContactLetterRail from '$lib/components/contacts/ContactLetterRail.svelte';
	import ContactsSidebar from '$lib/components/contacts/ContactsSidebar.svelte';
	import SwipeableListRow from '$lib/components/ui/SwipeableListRow.svelte';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { invalidAddressParts, parseAddressList } from '$lib/utils/addresses';
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

	const listTitle = $derived(
		query.trim()
			? `Search: ${query.trim()}`
			: selectedLetter
				? selectedLetter
				: 'All contacts'
	);

	const showLetterNav = $derived(!query.trim() && availableLetters.length > 0);
	const newEmailInvalid = $derived(newEmail.trim() && invalidAddressParts(newEmail).length > 0);
	const newEmailExists = $derived(
		!!newEmail.trim() &&
			allContacts.some((contact) => contact.email.toLowerCase() === newEmail.trim().toLowerCase())
	);
	const canSaveContact = $derived(
		!!auth.client?.getAccountId() &&
			parseAddressList(newEmail).length === 1 &&
			!newEmailInvalid &&
			!newEmailExists
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
		if (!accountId || !canSaveContact) return;

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

	$effect(() => {
		const generation = shellHeader.setPage({
			title: listTitle,
			primaryAction: {
				kind: 'button',
				label: 'Add contact',
				icon: UserPlus,
				onclick: () => {
					showAddForm = true;
					selectedEmail = null;
				}
			}
		});
		return () => shellHeader.clearPage(generation);
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
		'z-mail-pane-surface flex min-h-0 min-w-0 flex-col overflow-hidden',
		selectedEmail
			? 'hidden md:flex md:w-(--width-list) md:max-w-(--width-list) md:flex-none'
			: 'flex flex-1',
		selectedEmail && 'md:border-r md:border-border'
	)}
	style="view-transition-name: contacts-list;"
	aria-label="Contacts list"
>
	<div class="z-pane-header hidden h-14 w-full shrink-0 items-center overflow-hidden border-b border-border/80 bg-surface px-4 md:flex">
		<h2 class="z-type-pane-title min-w-0 truncate">{listTitle}</h2>
	</div>

	<div class="flex shrink-0 flex-col gap-3 border-b border-border/80 px-4 py-3">
		{#if showAddForm}
			<form class="mb-3 grid gap-3 border-b border-border bg-surface-sunken/40 p-4 sm:grid-cols-2" onsubmit={addContact}>
				<label class="block text-sm">
					<span class="mb-1 block text-fg-muted">
						Name
					</span>
					<input type="text" class="z-input" placeholder="Jane Doe" autocomplete="name" bind:value={newName} />
				</label>
				<label class="block text-sm">
					<span class="mb-1 block text-fg-muted">
						Email
					</span>
					<input
						type="email"
						class="z-input"
						placeholder="jane@example.com"
						autocomplete="email"
						aria-invalid={newEmailInvalid || newEmailExists ? 'true' : undefined}
						aria-describedby="new-contact-email-hint"
						bind:value={newEmail}
						required
					/>
				</label>
				<p
					id="new-contact-email-hint"
					class={cn(
						'sm:col-span-2 text-xs',
						newEmailInvalid || newEmailExists ? 'text-danger' : 'text-fg-subtle'
					)}
				>
					{#if newEmailExists}
						This contact is already saved.
					{:else if newEmailInvalid}
						Enter one valid email address.
					{:else}
						Use one address, like jane@example.com.
					{/if}
				</p>
				<div class="flex gap-2 sm:col-span-2">
					<Button type="submit" disabled={!canSaveContact}>Save contact</Button>
					<Button type="button" variant="ghost" onclick={() => (showAddForm = false)}>Cancel</Button>
				</div>
			</form>
		{/if}

		<label class="relative block">
			<span class="sr-only">Search contacts</span>
			<Search
				class={cn(
					'pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle'
				)}
			/>
			<input
				type="search"
				enterkeyhint="search"
				inputmode="search"
				class="z-sidebar-search-input"
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

	<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
		{#if showLetterNav}
			<ContactLetterRail
				letters={availableLetters}
				{selectedLetter}
				onSelectLetter={selectLetter}
			/>
		{/if}

		<div class="z-pane-scroll min-h-0 flex-1 overflow-y-auto">
		{#if contacts.length}
			<div class={cn(showLetterNav && 'md:pr-12')}>
				{#each groupedContacts as [letter, group] (letter)}
					<section>
						<h3 class="sticky top-0 z-[1] bg-surface/95 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-fg-subtle backdrop-blur-sm">
							{letter}
						</h3>
						<ul class="divide-y divide-border">
							{#each group as contact (contact.email)}
								<li>
									<SwipeableListRow
										enabled={supportsMobileListGestures()}
										trailing={[
											{
												id: 'delete',
												label: 'Remove',
												variant: 'danger',
												onAction: () => deleteContact(contact.email)
											}
										]}
									>
										<button
											type="button"
											class={cn(
												'z-list-row flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-sunken/60',
												selectedEmail === contact.email && 'z-list-row--current'
											)}
											aria-current={selectedEmail === contact.email ? 'true' : undefined}
											onclick={() => selectContact(contact.email)}
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
									</SwipeableListRow>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col items-center gap-3 px-4 py-12 text-center">
				<div class="rounded-full bg-accent/10 p-3 text-accent">
					<Users class="size-6" aria-hidden="true" />
				</div>
				<div>
					<p class="text-sm font-semibold text-fg">
						{#if query.trim()}
							No contacts match your search
						{:else if selectedLetter}
							No contacts under {selectedLetter}
						{:else}
							No contacts yet
						{/if}
					</p>
					<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">
							{#if query.trim()}
								Try a different name or email address.
							{:else}
								Contacts appear as you send and receive mail, or add someone manually.
							{/if}
						</p>
				</div>
				<div class="flex flex-wrap justify-center gap-2">
					<Button variant="ghost" onclick={() => (showAddForm = true)}>Add contact</Button>
					<Button href={settings.preferredMailHref()} variant="ghost">Open mail</Button>
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
