<script lang="ts">
	import { goto } from '$app/navigation';
	import { Search, User } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { listContacts } from '$lib/utils/contact-index';
	import { searchOperatorHint } from '$lib/mail/search-query';
	import { cn } from '$lib/utils/cn';

	let input = $state('');
	let open = $state(false);
	let searchInput = $state<HTMLInputElement | null>(null);
	const dropdownId = 'global-search-suggestions';

	$effect(() => {
		if ($page.url.pathname === '/mail/search') {
			input = $page.url.searchParams.get('q') ?? '';
		}
	});

	const contactMatches = $derived.by(() => {
		if (!settings.showSearchContactSuggestions) return [];
		const query = input.trim();
		if (query.length < 1) return [];
		return listContacts(auth.client?.getAccountId() ?? null, query).slice(0, 4);
	});

	const showDropdown = $derived(open && input.trim().length > 0);

	function submit() {
		const query = input.trim();
		if (!query) return;
		open = false;
		goto(`/mail/search?q=${encodeURIComponent(query)}`);
	}

	function composeTo(email: string) {
		open = false;
		input = '';
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}

	function onSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
			searchInput?.blur();
		}
	}

	function isTypingTarget(target: EventTarget | null) {
		return (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement ||
			(target instanceof HTMLElement && target.isContentEditable)
		);
	}

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (!settings.enableKeyboardShortcuts) return;
			if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
			if (isTypingTarget(event.target)) return;

			event.preventDefault();
			if (searchInput && !settings.hideHeaderSearch) {
				searchInput.focus();
				open = true;
			} else {
				goto('/mail/search');
			}
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<IconButton
	label="Search mail"
	class={settings.hideHeaderSearch ? '' : 'md:hidden'}
	onclick={() => goto('/mail/search')}
>
	<Search class="size-4" />
</IconButton>

{#if !settings.hideHeaderSearch}
<form
	role="search"
	class="relative mx-auto hidden w-full max-w-md md:block"
	onsubmit={(e) => {
		e.preventDefault();
		submit();
	}}
>
	<label class="sr-only" for="global-search">Search mail</label>
	<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
	<input
		bind:this={searchInput}
		id="global-search"
		type="search"
		placeholder="Search messages or contacts…{settings.enableKeyboardShortcuts && !settings.hideComposeHints
			? ' (/ to focus)'
			: ''}{!settings.hideComposeHints ? ` · ${searchOperatorHint()}` : ''}"
		class="z-input pl-9"
		autocomplete="off"
		bind:value={input}
		aria-controls={showDropdown ? dropdownId : undefined}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 150)}
		onkeydown={onSearchKeydown}
	/>

	{#if showDropdown}
		<div
			id={dropdownId}
			role="menu"
			tabindex="-1"
			class="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-surface-raised py-1 shadow-md"
		>
			<button
				type="submit"
				role="menuitem"
				class={cn(
					'flex w-full items-center gap-2 px-3 text-left text-sm hover:bg-surface-sunken',
					settings.compactSearchDropdown ? 'py-1.5' : 'py-2'
				)}
			>
				<Search class="size-4 text-fg-subtle" aria-hidden="true" />
				Search mail for “{input.trim()}”
			</button>

			{#if contactMatches.length}
				{#if !settings.hideSearchDropdownHeaders}
					<p
						class={cn(
							'z-type-label px-3',
							settings.compactSearchDropdown ? 'py-1' : 'py-1.5'
						)}
					>
						Contacts
					</p>
				{/if}
				{#each contactMatches as contact (contact.email)}
					<button
						type="button"
						role="menuitem"
						class={cn(
							'flex w-full items-center gap-2 px-3 text-left text-sm hover:bg-surface-sunken',
							settings.compactSearchDropdown ? 'py-1.5' : 'py-2'
						)}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => composeTo(contact.email)}
					>
						<User class="size-4 text-fg-subtle" aria-hidden="true" />
						<span class="min-w-0 truncate">
							<span class="text-fg">{contact.name}</span>
							<span class="ml-1 text-fg-muted">{contact.email}</span>
						</span>
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</form>
{/if}
