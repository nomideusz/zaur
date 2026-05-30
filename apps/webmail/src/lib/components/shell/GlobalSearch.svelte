<script lang="ts">
	import { goto } from '$app/navigation';
	import Search from '$lib/components/icons/Search.svelte';
	import User from '$lib/components/icons/User.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { listContacts } from '$lib/utils/contact-index';
	import { searchOperatorHint } from '$lib/mail/search-query';
	import { cn } from '$lib/utils/cn';

	interface Props {
		placement?: 'shell' | 'sidebar' | 'mobile';
		class?: string;
		autofocus?: boolean;
	}

	let { placement = 'shell', class: className = '', autofocus = false }: Props = $props();

	let input = $state('');
	let open = $state(false);
	let searchInput = $state<HTMLInputElement | null>(null);
	const isSidebar = $derived(placement === 'sidebar');
	const isMobile = $derived(placement === 'mobile');
	const dropdownId = $derived(
		isSidebar ? 'sidebar-search-suggestions' : isMobile ? 'mobile-search-suggestions' : 'global-search-suggestions'
	);
	const inputId = $derived(
		isSidebar ? 'sidebar-search' : isMobile ? 'mobile-search' : 'global-search'
	);

	$effect(() => {
		if ($page.url.pathname === '/mail/search') {
			input = $page.url.searchParams.get('q') ?? '';
		}
	});

	$effect(() => {
		if (!isMobile || !searchInput) return;
		if (!autofocus && $page.url.searchParams.get('focus') !== '1') return;
		requestAnimationFrame(() => searchInput?.focus());
	});

	const contactMatches = $derived.by(() => {
		if (!settings.showSearchContactSuggestions) return [];
		const query = input.trim();
		if (query.length < 1) return [];
		return listContacts(auth.client?.getAccountId() ?? null, query).slice(0, 4);
	});

	const showDropdown = $derived(open && input.trim().length > 0);

	const placeholder = $derived.by(() => {
		if (isMobile) {
			return 'Search messages or contacts…';
		}
		if (isSidebar) {
			return `Search…${settings.enableKeyboardShortcuts && !settings.hideComposeHints ? ' (/)' : ''}`;
		}
		return `Search messages or contacts…${settings.enableKeyboardShortcuts && !settings.hideComposeHints ? ' (/ to focus)' : ''}${!settings.hideComposeHints ? ` · ${searchOperatorHint()}` : ''}`;
	});

	function searchPageUrl(focus = false): string {
		return focus ? '/mail/search?focus=1' : '/mail/search';
	}

	function currentMailboxIdFromPath(): string | null {
		const match = $page.url.pathname.match(/^\/mail\/([^/]+)/);
		if (!match || match[1] === 'search' || match[1] === 'compose') return null;
		return decodeURIComponent(match[1]);
	}

	function submit() {
		const query = input.trim();
		if (!query) return;
		open = false;

		const params = new URLSearchParams({ q: query });
		if (settings.searchScope === 'current-folder') {
			const routeId = currentMailboxIdFromPath();
			const mailbox = routeId ? mail.mailboxByRouteId(routeId) : null;
			if (mailbox?.jmapId) params.set('mailbox', mailbox.jmapId);
		}
		goto(`/mail/search?${params.toString()}`);
	}

	function composeTo(email: string) {
		open = false;
		input = '';
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}

	function menuItems(): HTMLButtonElement[] {
		const menu = document.getElementById(dropdownId);
		return menu ? Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')) : [];
	}

	function focusMenuItem(index: number) {
		const items = menuItems();
		if (!items.length) return;
		items[Math.max(0, Math.min(index, items.length - 1))]?.focus();
	}

	function onSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
			searchInput?.blur();
		} else if (event.key === 'ArrowDown' && showDropdown) {
			event.preventDefault();
			focusMenuItem(0);
		}
	}

	function onMenuKeydown(event: KeyboardEvent) {
		const items = menuItems();
		const currentIndex = items.findIndex((item) => item === document.activeElement);
		if (event.key === 'Escape') {
			event.preventDefault();
			open = false;
			searchInput?.focus();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			focusMenuItem((currentIndex + 1) % items.length);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			focusMenuItem((currentIndex - 1 + items.length) % items.length);
		} else if (event.key === 'Home') {
			event.preventDefault();
			focusMenuItem(0);
		} else if (event.key === 'End') {
			event.preventDefault();
			focusMenuItem(items.length - 1);
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

	function focusVisibleMailSearch() {
		for (const candidate of document.querySelectorAll<HTMLInputElement>('[data-zaur-mail-search]')) {
			if (candidate.offsetParent !== null) {
				candidate.focus();
				open = true;
				return true;
			}
		}
		return false;
	}

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (!settings.enableKeyboardShortcuts) return;
			if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
			if (isTypingTarget(event.target)) return;

			event.preventDefault();
			if (!settings.hideHeaderSearch) {
				if (focusVisibleMailSearch()) return;
				if (searchInput && !isMobile) {
					searchInput.focus();
					open = true;
					return;
				}
			}
			goto(searchPageUrl(true));
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

{#if placement === 'shell' && !settings.hideHeaderSearch}
	<IconButton label="Search mail" class="md:hidden" onclick={() => goto(searchPageUrl(true))}>
		<Search class="size-4" />
	</IconButton>
{/if}

{#if !settings.hideHeaderSearch && (isSidebar || isMobile || placement === 'shell')}
	<form
		role="search"
		class={cn(
			'relative w-full min-w-0',
			isSidebar || isMobile ? className : cn('mx-auto hidden max-w-xl md:block', className)
		)}
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<label class="sr-only" for={inputId}>Search mail</label>
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
		/>
		<input
			bind:this={searchInput}
			id={inputId}
			type="search"
			data-zaur-mail-search={isSidebar || isMobile ? '' : undefined}
			enterkeyhint="search"
			inputmode="search"
			{placeholder}
			class={cn(
				isSidebar || isMobile ? 'z-sidebar-search-input' : 'z-input z-chrome-field w-full rounded-full pl-9 shadow-none'
			)}
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
				class={cn(
					'absolute left-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-surface-raised py-1.5 shadow-md',
					isSidebar || isMobile ? 'right-0 min-w-[14rem]' : 'right-0'
				)}
				onkeydown={onMenuKeydown}
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
