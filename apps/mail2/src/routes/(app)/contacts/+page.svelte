<script lang="ts">
	import { goto } from '$app/navigation';
	import { contactDisplayName, contactLetter, contactMatches } from '@zaur/mail-core';
	import type { Contact, ContactInput } from '@zaur/mail-core';
	import SectionShell from '#lib/components/mail/SectionShell.svelte';
	import ContactEditor from '#lib/components/contacts/ContactEditor.svelte';
	import { getHobdayTheme } from '#lib/mail/colors';
	import { whoami } from '../../session.remote';
	import { contacts as contactsRemote, saveContact, deleteContact } from '../../contacts.remote';
	import { LiveUpdates } from '#lib/mail/live';

	const session = $derived(whoami()?.current ?? null);
	const resource = $derived(session ? contactsRemote() : undefined);
	const contactsState = $derived(resource?.current ?? null);

	// Session gone (expired/revoked mid-use) → own login page.
	$effect(() => {
		const current = whoami()?.current;
		if (whoami().ready && !current) goto('/login', { replaceState: true });
	});

	// Push: a card saved on the phone shows up here without a reload.
	$effect(() => {
		if (!session) return;
		const live = new LiveUpdates();
		live.start(({ contact }) => {
			if (contact) void resource?.refresh();
		});
		return () => live.stop();
	});

	let query = $state('');
	let selectedId = $state<string | null>(null);
	let mode = $state<'view' | 'edit' | 'new'>('view');
	let saving = $state(false);
	let editorError = $state<string | null>(null);
	let notice = $state<string | null>(null);

	const all = $derived(contactsState?.contacts ?? []);
	const visible = $derived(all.filter((contact) => contactMatches(contact, query)));
	const selected = $derived(all.find((contact) => contact.id === selectedId) ?? null);

	/** Letter groups, in the order the sorted list already has them; '#' goes last. */
	const groups = $derived.by(() => {
		const out: { letter: string; items: Contact[] }[] = [];
		for (const contact of visible) {
			const letter = contactLetter(contact);
			const last = out[out.length - 1];
			if (last && last.letter === letter) last.items.push(contact);
			else out.push({ letter, items: [contact] });
		}
		const hash = out.findIndex((group) => group.letter === '#');
		if (hash > -1) out.push(...out.splice(hash, 1));
		return out;
	});

	function open(contact: Contact) {
		selectedId = contact.id;
		mode = 'view';
		editorError = null;
	}

	function startNew() {
		selectedId = null;
		mode = 'new';
		editorError = null;
	}

	function messageOf(cause: unknown, fallback: string): string {
		if (cause && typeof cause === 'object' && 'body' in cause) {
			const body = (cause as { body?: { message?: string } }).body;
			if (body?.message) return body.message;
		}
		return cause instanceof Error && cause.message ? cause.message : fallback;
	}

	async function save(input: ContactInput) {
		saving = true;
		editorError = null;
		try {
			const result = await saveContact(
				mode === 'edit' && selected
					? { id: selected.id, accountId: selected.accountId, contact: input }
					: { contact: input }
			);
			await resource?.refresh();
			selectedId = result.id;
			mode = 'view';
			notice = 'Contact saved';
			setTimeout(() => (notice = null), 2500);
		} catch (cause) {
			editorError = messageOf(cause, 'The contact could not be saved.');
		} finally {
			saving = false;
		}
	}

	async function remove(contact: Contact) {
		if (!confirm(`Delete ${contactDisplayName(contact)} from your contacts?`)) return;
		saving = true;
		try {
			await deleteContact({ id: contact.id, accountId: contact.accountId });
			await resource?.refresh();
			if (selectedId === contact.id) selectedId = null;
			notice = 'Contact deleted';
			setTimeout(() => (notice = null), 2500);
		} catch (cause) {
			notice = messageOf(cause, 'The contact could not be deleted.');
		} finally {
			saving = false;
		}
	}

	const initials = (contact: Contact) => {
		const name = contactDisplayName(contact);
		const parts = name.split(/[\s@._-]+/).filter(Boolean);
		return parts.length >= 2
			? ((parts[0]![0] ?? '') + (parts[1]![0] ?? '')).toUpperCase()
			: name.slice(0, 2).toUpperCase();
	};
	const theme = (contact: Contact) => getHobdayTheme(contact.emails[0]?.address ?? contactDisplayName(contact));

	/** On a phone the pane shown is the one with something in it. */
	const detailOpen = $derived(mode !== 'view' || selected !== null);
</script>

<svelte:head><title>Contacts · Zaur Mail</title></svelte:head>

<SectionShell title="Contacts">
	{#snippet controls()}
		<div class="relative flex items-center max-md:hidden">
			<svg class="pointer-events-none absolute left-2.5 size-3.5 text-[var(--z-faint)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
				<path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
			<input
				type="search"
				bind:value={query}
				placeholder="Search contacts…"
				aria-label="Search contacts"
				class="z-field w-[240px] !pl-8"
			/>
		</div>
		<button type="button" class="btn-tactile gap-1.5" onclick={startNew} disabled={!contactsState?.supported}>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
			</svg>
			<span class="max-md:sr-only">New contact</span>
		</button>
	{/snippet}

	<div class="flex min-h-0 flex-1">
		<!-- List -->
		<div class="flex w-[380px] shrink-0 flex-col border-r border-[var(--z-hairline)] max-md:w-full max-md:border-r-0 {detailOpen ? 'max-md:hidden' : ''}">
			<div class="flex items-center gap-2 border-b border-[var(--z-hairline)] px-4 py-2.5">
				<input
					type="search"
					bind:value={query}
					placeholder="Search contacts…"
					aria-label="Search contacts"
					class="z-field w-full md:hidden max-md:text-base"
				/>
				<span class="text-[12px] text-[var(--z-soft)] tabular-nums max-md:hidden">
					{#if contactsState}
						{visible.length === all.length ? `${all.length} contacts` : `${visible.length} of ${all.length}`}
					{/if}
				</span>
				{#if notice}
					<span class="ml-auto truncate text-[12px] font-medium text-[var(--z-muted)]" role="status">{notice}</span>
				{/if}
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto">
				{#if resource?.error}
					<div class="p-6 text-center text-[13px] text-[var(--z-ch-discard-ink)]">
						Could not load your contacts.
						<button type="button" class="btn-tactile mt-3 !h-[28px]" onclick={() => resource?.refresh()}>Retry</button>
					</div>
				{:else if !contactsState}
					<ul class="space-y-1 p-3">
						{#each [1, 2, 3, 4, 5, 6] as n (n)}<li class="h-[44px] animate-pulse rounded-[8px] bg-[var(--z-sunken)]"></li>{/each}
					</ul>
				{:else if !contactsState.supported}
					<p class="p-6 text-[13px] leading-relaxed text-[var(--z-soft)]">
						This mail server does not offer contacts over JMAP, so there is nothing to show here.
						Compose still suggests people who have written to you.
					</p>
				{:else if all.length === 0}
					<div class="p-6 text-center">
						<p class="text-[13px] text-[var(--z-soft)]">No contacts yet.</p>
						<button type="button" class="btn-tactile mt-3" onclick={startNew}>Add the first one</button>
					</div>
				{:else if visible.length === 0}
					<p class="p-6 text-center text-[13px] text-[var(--z-soft)]">Nobody matches “{query}”.</p>
				{:else}
					{#each groups as group (group.letter)}
						<div class="z-caption sticky top-0 z-10 border-b border-[var(--z-hairline)] bg-[color-mix(in_oklab,var(--z-surface)_95%,transparent)] px-4 py-1.5 backdrop-blur">
							{group.letter}
						</div>
						<ul role="list">
							{#each group.items as contact (contact.id)}
								{@const colors = theme(contact)}
								{@const isSelected = contact.id === selectedId}
								<li>
									<button
										type="button"
										class="flex w-full items-center gap-3 border-b border-[var(--z-sunken)] px-4 py-2 text-left transition-colors {isSelected ? 'bg-[var(--z-accent-tint)]' : 'hover:bg-[var(--z-hover)]'}"
										onclick={() => open(contact)}
										aria-current={isSelected ? 'true' : undefined}
									>
										<span
											class="flex size-8 shrink-0 items-center justify-center rounded-[6px] border text-[11px] font-bold"
											style:background-color={colors.bg}
											style:border-color={colors.border}
											style:color={colors.text}
										>
											{initials(contact)}
										</span>
										<span class="min-w-0 flex-1">
											<span class="block truncate text-[13.5px] font-medium text-[var(--z-ink)]">{contactDisplayName(contact)}</span>
											<span class="block truncate text-[12px] text-[var(--z-soft)]">
												{contact.emails[0]?.address ?? contact.phones[0]?.number ?? contact.organization}
											</span>
										</span>
									</button>
								</li>
							{/each}
						</ul>
					{/each}
					{#if contactsState.truncated}
						<p class="px-4 py-3 text-[12px] text-[var(--z-faint)]">Showing the first {all.length} — use search to find the rest.</p>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Detail / editor -->
		<div class="min-w-0 flex-1 {detailOpen ? '' : 'max-md:hidden'}">
			{#if mode === 'new' || (mode === 'edit' && selected)}
				<ContactEditor
					contact={mode === 'edit' ? selected : null}
					{saving}
					error={editorError}
					onSave={save}
					onCancel={() => {
						mode = 'view';
						editorError = null;
					}}
				/>
			{:else if selected}
				{@const colors = theme(selected)}
				<div class="flex h-full flex-col">
					<div class="flex items-center gap-2 border-b border-[var(--z-hairline)] px-6 py-3 max-md:px-3">
						<button type="button" class="btn-tactile !size-[30px] !p-0 md:hidden" aria-label="Back to the list" onclick={() => (selectedId = null)}>
							<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
						<div class="ml-auto flex items-center gap-2">
							<a href="/?to={encodeURIComponent(selected.emails[0]?.address ?? '')}" class="btn-tactile !h-[30px]" class:pointer-events-none={!selected.emails.length} class:opacity-50={!selected.emails.length}>
								Write
							</a>
							<button type="button" class="btn-tactile !h-[30px]" onclick={() => (mode = 'edit')}>Edit</button>
							<button type="button" class="btn-tactile !h-[30px] !text-[var(--z-ch-discard-ink)]" disabled={saving} onclick={() => remove(selected!)}>Delete</button>
						</div>
					</div>
					<div class="min-h-0 flex-1 overflow-y-auto px-8 py-6 max-md:px-4">
						<!-- A person is carried by the avatar tile; the card around it stays neutral,
						     because a surface hue means a channel, not who someone is. -->
						<div class="flex items-center gap-4 rounded-[10px] border border-[var(--z-hairline)] bg-[var(--z-surface)] p-4 shadow-[var(--z-shadow-tactile)]">
							<span
								class="flex size-14 shrink-0 items-center justify-center rounded-[8px] border text-[18px] font-bold"
								style:background-color={colors.bg}
								style:border-color={colors.border}
								style:color={colors.text}
							>
								{initials(selected)}
							</span>
							<div class="min-w-0">
								<h2 class="truncate text-[18px] font-bold tracking-tight text-[var(--z-ink)]">{contactDisplayName(selected)}</h2>
								{#if selected.nickname}<p class="text-[13px] text-[var(--z-soft)]">“{selected.nickname}”</p>{/if}
								{#if selected.title || selected.organization}
									<p class="truncate text-[13px] text-[var(--z-muted)]">
										{[selected.title, selected.organization].filter(Boolean).join(' · ')}
									</p>
								{/if}
							</div>
						</div>

						{#if selected.emails.length}
							<h3 class="z-caption mt-6">Email</h3>
							<ul class="mt-2 divide-y divide-[var(--z-sunken)]">
								{#each selected.emails as email (email.address)}
									<li class="flex items-center justify-between gap-3 py-2">
										<a href="/?to={encodeURIComponent(email.address)}" class="truncate text-[13.5px] font-medium text-[var(--z-body)] hover:text-[var(--z-accent-edge)] hover:underline">{email.address}</a>
										{#if email.label}<span class="shrink-0 text-[12px] text-[var(--z-faint)]">{email.label}</span>{/if}
									</li>
								{/each}
							</ul>
						{/if}

						{#if selected.phones.length}
							<h3 class="z-caption mt-6">Phone</h3>
							<ul class="mt-2 divide-y divide-[var(--z-sunken)]">
								{#each selected.phones as phone (phone.number)}
									<li class="flex items-center justify-between gap-3 py-2">
										<a href="tel:{phone.number.replace(/[^\d+]/g, '')}" class="text-[13.5px] font-medium text-[var(--z-body)] tabular-nums hover:text-[var(--z-accent-edge)] hover:underline">{phone.number}</a>
										{#if phone.label}<span class="shrink-0 text-[12px] text-[var(--z-faint)]">{phone.label}</span>{/if}
									</li>
								{/each}
							</ul>
						{/if}

						{#if selected.note}
							<h3 class="z-caption mt-6">Notes</h3>
							<p class="mt-2 text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--z-strong)]">{selected.note}</p>
						{/if}

						{#if selected.updated}
							<p class="mt-8 text-[12px] text-[var(--z-faint)]">
								Updated {new Date(selected.updated).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
							</p>
						{/if}
					</div>
				</div>
			{:else}
				<div class="flex h-full items-center justify-center p-8 text-center text-[13px] text-[var(--z-faint)] max-md:hidden">
					{#if contactsState?.supported}
						Pick someone from the list, or add a new contact.
					{/if}
				</div>
			{/if}
		</div>
	</div>
</SectionShell>
