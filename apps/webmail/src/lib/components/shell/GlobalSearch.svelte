<script lang="ts">
	import { goto } from '$app/navigation';
	import Search from '$lib/components/icons/Search.svelte';
	import User from '$lib/components/icons/User.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { LABEL_UNSEEN } from '$lib/mail/new-mail';
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
	let formContainer = $state<HTMLFormElement | null>(null);

	const isSidebar = $derived(placement === 'sidebar');
	const isMobile = $derived(placement === 'mobile');
	const dropdownId = $derived(
		isSidebar ? 'sidebar-search-suggestions' : isMobile ? 'mobile-search-suggestions' : 'global-search-suggestions'
	);
	const inputId = $derived(
		isSidebar ? 'sidebar-search' : isMobile ? 'mobile-search' : 'global-search'
	);

	// Advanced Search States
	let showAdvanced = $state(false);
	let advFrom = $state('');
	let advTo = $state('');
	let advSubject = $state('');
	let advText = $state('');
	let advHasAttachment = $state(false);
	let advMailboxId = $state<string>(''); // Empty means all
	let advDateRange = $state('any'); // any, 1d, 7d, 30d, 90d, 1y, custom
	let advAfterDate = $state('');
	let advBeforeDate = $state('');

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
		const query = input.trim();
		if (query.length < 1) return [];
		return listContacts(auth.client?.getAccountId() ?? null, query).slice(0, 4);
	});

	const showDropdown = $derived(open && !showAdvanced);

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
		showAdvanced = false;

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
			showAdvanced = false;
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

	function populateAdvancedFromInput(queryStr: string) {
		advFrom = '';
		advTo = '';
		advSubject = '';
		advText = '';
		advHasAttachment = false;
		advAfterDate = '';
		advBeforeDate = '';
		advDateRange = 'any';

		const tokens = queryStr.trim().match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
		const textTerms: string[] = [];

		for (const raw of tokens) {
			const token = raw.replace(/^"(.+)"$/, '$1');
			const match = token.match(/^(from|to|cc|subject|has|after|before):(?:"([^"]*)"|(\S+))$/i);
			if (!match) {
				textTerms.push(token);
				continue;
			}

			const key = match[1].toLowerCase();
			const value = (match[2] ?? match[3] ?? '').trim();

			switch (key) {
				case 'from':
					advFrom = value;
					break;
				case 'to':
					advTo = value;
					break;
				case 'subject':
					advSubject = value;
					break;
				case 'has':
					if (value.toLowerCase() === 'attachment') {
						advHasAttachment = true;
					}
					break;
				case 'after':
					advAfterDate = value.split('T')[0];
					break;
				case 'before':
					advBeforeDate = value.split('T')[0];
					break;
				default:
					textTerms.push(token);
			}
		}

		if (textTerms.length) {
			advText = textTerms.join(' ');
		}

		const currentMailboxParam = $page.url.searchParams.get('mailbox');
		if (currentMailboxParam) {
			advMailboxId = currentMailboxParam;
		} else {
			advMailboxId = '';
		}
	}

	function buildQueryFromAdvanced(): string {
		const parts: string[] = [];

		if (advFrom.trim()) {
			const val = advFrom.trim();
			parts.push(`from:${val.includes(' ') ? `"${val}"` : val}`);
		}
		if (advTo.trim()) {
			const val = advTo.trim();
			parts.push(`to:${val.includes(' ') ? `"${val}"` : val}`);
		}
		if (advSubject.trim()) {
			const val = advSubject.trim();
			parts.push(`subject:${val.includes(' ') ? `"${val}"` : val}`);
		}
		if (advHasAttachment) {
			parts.push('has:attachment');
		}

		let afterStr = '';
		let beforeStr = '';

		if (advDateRange === 'custom') {
			afterStr = advAfterDate;
			beforeStr = advBeforeDate;
		} else if (advDateRange !== 'any') {
			const now = new Date();
			if (advDateRange === '1d') {
				now.setDate(now.getDate() - 1);
			} else if (advDateRange === '7d') {
				now.setDate(now.getDate() - 7);
			} else if (advDateRange === '30d') {
				now.setDate(now.getDate() - 30);
			} else if (advDateRange === '90d') {
				now.setDate(now.getDate() - 90);
			} else if (advDateRange === '1y') {
				now.setFullYear(now.getFullYear() - 1);
			}
			afterStr = now.toISOString().split('T')[0];
		}

		if (afterStr) {
			parts.push(`after:${afterStr}`);
		}
		if (beforeStr) {
			parts.push(`before:${beforeStr}`);
		}

		if (advText.trim()) {
			parts.push(advText.trim());
		}

		return parts.join(' ');
	}

	function toggleAdvanced(event: MouseEvent) {
		event.stopPropagation();
		if (!showAdvanced) {
			populateAdvancedFromInput(input);
			showAdvanced = true;
			open = false;
		} else {
			showAdvanced = false;
		}
	}

	function submitAdvanced() {
		const query = buildQueryFromAdvanced();
		input = query;
		showAdvanced = false;
		open = false;

		const params = new URLSearchParams({ q: query });
		if (advMailboxId) {
			params.set('mailbox', advMailboxId);
		}
		goto(`/mail/search?${params.toString()}`);
	}

	function clearAdvanced() {
		advFrom = '';
		advTo = '';
		advSubject = '';
		advText = '';
		advHasAttachment = false;
		advMailboxId = '';
		advDateRange = 'any';
		advAfterDate = '';
		advBeforeDate = '';
		input = '';
	}

	function handleWindowClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Node)) return;
		if (formContainer && formContainer.contains(target)) return;
		open = false;
		showAdvanced = false;
	}

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (!settings.enableKeyboardShortcuts) return;
			if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
			if (isTypingTarget(event.target)) return;

			event.preventDefault();
			if (focusVisibleMailSearch()) return;
			if (searchInput && !isMobile) {
				searchInput.focus();
				open = true;
				return;
			}
			goto(searchPageUrl(true));
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<svelte:window onclick={handleWindowClick} />

{#if placement === 'shell'}
	<IconButton label="Search mail" class="md:hidden" onclick={() => goto(searchPageUrl(true))}>
		<Search class="size-4" />
	</IconButton>
{/if}

{#if isSidebar || isMobile || placement === 'shell'}
	<form
		bind:this={formContainer}
		role="search"
		class={cn(
			'relative w-full min-w-0',
			isSidebar || isMobile ? className : cn('hidden w-full md:block', className)
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
				isSidebar || isMobile ? 'z-sidebar-search-input pr-10' : 'z-input z-chrome-field w-full rounded-full pl-9 pr-10 shadow-none'
			)}
			autocomplete="off"
			bind:value={input}
			aria-controls={showDropdown ? dropdownId : undefined}
			onfocus={() => {
				if (!showAdvanced) open = true;
			}}
			onkeydown={onSearchKeydown}
		/>

		{#if placement === 'shell' || isMobile}
			<button
				type="button"
				class="absolute top-1/2 right-3 size-7 -translate-y-1/2 flex items-center justify-center rounded-full hover:bg-surface-sunken text-fg-subtle hover:text-fg transition-colors z-20 cursor-pointer"
				onclick={toggleAdvanced}
				title="Show advanced search options"
			>
				<ChevronDown class={cn('size-4 transition-transform duration-200', showAdvanced && 'rotate-180')} />
			</button>
		{/if}

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
				{#if input.trim().length === 0}
					<p class="z-type-label px-3 py-1 text-fg-muted font-bold text-[10px] uppercase tracking-wider">Quick Filters</p>
					<button
						type="button"
						role="menuitem"
						class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-sunken"
						onclick={() => {
							input = 'has:attachment';
							searchInput?.focus();
						}}
					>
						<span class="inline-flex size-4.5 items-center justify-center rounded bg-surface-sunken border border-border text-[11px]">📎</span>
						<span>Has attachment</span>
					</button>
					<button
						type="button"
						role="menuitem"
						class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-sunken"
						onclick={() => {
							input = 'is:unseen';
							searchInput?.focus();
						}}
					>
						<span class="inline-flex size-4.5 items-center justify-center rounded bg-surface-sunken border border-border text-[11px]">✉️</span>
						<span>{LABEL_UNSEEN} messages</span>
					</button>
					{#if auth.username}
						<button
							type="button"
							role="menuitem"
							class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-sunken"
							onclick={() => {
								input = `from:${auth.username}`;
								searchInput?.focus();
							}}
						>
							<span class="inline-flex size-4.5 items-center justify-center rounded bg-surface-sunken border border-border text-[11px]">👤</span>
							<span>Sent by me</span>
						</button>
					{/if}
					<button
						type="button"
						role="menuitem"
						class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-sunken"
						onclick={() => {
							const now = new Date();
							now.setDate(now.getDate() - 7);
							const dateStr = now.toISOString().split('T')[0];
							input = `after:${dateStr}`;
							searchInput?.focus();
						}}
					>
						<span class="inline-flex size-4.5 items-center justify-center rounded bg-surface-sunken border border-border text-[11px]">📅</span>
						<span>Received in last 7 days</span>
					</button>

					<div class="h-px bg-border my-1"></div>
					<p class="z-type-label px-3 py-1 text-fg-muted font-bold text-[10px] uppercase tracking-wider">Search Hints</p>
					<div class="px-3 py-1 text-xs text-fg-subtle leading-relaxed flex flex-col gap-1">
						<div>Search operators supported:</div>
						<div class="font-mono bg-surface-sunken/60 px-1.5 py-0.5 rounded border border-border/50 text-[10px] select-all">
							from:sender@example.com
						</div>
						<div class="font-mono bg-surface-sunken/60 px-1.5 py-0.5 rounded border border-border/50 text-[10px] select-all">
							subject:"meeting report"
						</div>
					</div>
					{#if placement === 'shell' || isMobile}
						<div class="h-px bg-border my-1"></div>
						<button
							type="button"
							role="menuitem"
							class="flex w-full items-center justify-center gap-1 px-3 py-1.5 text-center text-xs text-accent hover:bg-surface-sunken font-semibold transition-colors"
							onclick={(e) => toggleAdvanced(e)}
						>
							Advanced Search Options
						</button>
					{/if}
				{:else}
					<button
						type="submit"
						role="menuitem"
						class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-sunken"
					>
						<Search class="size-4 text-fg-subtle" aria-hidden="true" />
						Search mail for “{input.trim()}”
					</button>

					{#if contactMatches.length}
						<p class="z-type-label px-3 py-1.5">Contacts</p>
						{#each contactMatches as contact (contact.email)}
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-sunken"
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
				{/if}
			</div>
		{/if}

		{#if showAdvanced}
			<div
				role="dialog"
				aria-label="Advanced search options"
				tabindex="-1"
				class={cn(
					'absolute top-full z-50 mt-2 w-full max-w-[30rem] overflow-hidden rounded-xl border border-border bg-surface-raised p-4 shadow-lg text-sm text-fg flex flex-col gap-3.5',
					isSidebar || isMobile ? 'right-0 left-0' : 'right-0'
				)}
				onkeydown={(e) => {
					if (e.key === 'Escape') {
						showAdvanced = false;
						searchInput?.focus();
					}
				}}
			>
				<div class="flex items-center justify-between border-b border-border pb-2">
					<span class="font-semibold text-fg text-sm">Advanced Search Options</span>
					<button
						type="button"
						class="text-fg-subtle hover:text-fg text-xs transition-colors cursor-pointer"
						onclick={clearAdvanced}
					>
						Clear all
					</button>
				</div>

				<div class="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-fg-muted" for="adv-mailbox">Search in</label>
						<select
							id="adv-mailbox"
							class="z-input w-full bg-surface-sunken rounded-md border border-border px-3 py-1.5 focus:border-border-strong focus:outline-none"
							bind:value={advMailboxId}
						>
							<option value="">All Mailboxes</option>
							{#each mail.mailboxes as mb}
								<option value={mb.jmapId || mb.id}>{mb.name}</option>
							{/each}
						</select>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-fg-muted" for="adv-from">From</label>
						<input
							id="adv-from"
							type="text"
							class="z-input w-full bg-surface-sunken rounded-md border border-border px-3 py-1.5 focus:border-border-strong focus:outline-none"
							placeholder="Sender's name or email"
							bind:value={advFrom}
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-fg-muted" for="adv-to">To</label>
						<input
							id="adv-to"
							type="text"
							class="z-input w-full bg-surface-sunken rounded-md border border-border px-3 py-1.5 focus:border-border-strong focus:outline-none"
							placeholder="Recipient's name or email"
							bind:value={advTo}
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-fg-muted" for="adv-subject">Subject</label>
						<input
							id="adv-subject"
							type="text"
							class="z-input w-full bg-surface-sunken rounded-md border border-border px-3 py-1.5 focus:border-border-strong focus:outline-none"
							placeholder="Subject line contains"
							bind:value={advSubject}
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-fg-muted" for="adv-text">Keywords / Body</label>
						<input
							id="adv-text"
							type="text"
							class="z-input w-full bg-surface-sunken rounded-md border border-border px-3 py-1.5 focus:border-border-strong focus:outline-none"
							placeholder="Has the words"
							bind:value={advText}
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div class="flex flex-col gap-1">
							<label class="text-xs font-medium text-fg-muted" for="adv-daterange">Date range</label>
							<select
								id="adv-daterange"
								class="z-input w-full bg-surface-sunken rounded-md border border-border px-3 py-1.5 focus:border-border-strong focus:outline-none"
								bind:value={advDateRange}
							>
								<option value="any">Any time</option>
								<option value="1d">Last 24 hours</option>
								<option value="7d">Last 7 days</option>
								<option value="30d">Last 30 days</option>
								<option value="90d">Last 90 days</option>
								<option value="1y">Last year</option>
								<option value="custom">Custom range…</option>
							</select>
						</div>

						<div class="flex items-end pb-1.5">
							<label class="flex items-center gap-2 cursor-pointer select-none text-fg-muted hover:text-fg transition-colors">
								<input
									type="checkbox"
									class="rounded border-border bg-surface-sunken text-accent focus:ring-accent focus:ring-offset-surface-raised"
									bind:checked={advHasAttachment}
								/>
								<span class="text-xs font-medium">Has attachment</span>
							</label>
						</div>
					</div>

					{#if advDateRange === 'custom'}
						<div class="grid grid-cols-2 gap-3 border-t border-border/50 pt-2 mt-1">
							<div class="flex flex-col gap-1">
								<label class="text-xs font-medium text-fg-muted" for="adv-after">After Date</label>
								<input
									id="adv-after"
									type="date"
									class="z-input w-full bg-surface-sunken rounded-md border border-border px-3 py-1.5 focus:border-border-strong focus:outline-none"
									bind:value={advAfterDate}
								/>
							</div>
							<div class="flex flex-col gap-1">
								<label class="text-xs font-medium text-fg-muted" for="adv-before">Before Date</label>
								<input
									id="adv-before"
									type="date"
									class="z-input w-full bg-surface-sunken rounded-md border border-border px-3 py-1.5 focus:border-border-strong focus:outline-none"
									bind:value={advBeforeDate}
								/>
							</div>
						</div>
					{/if}
				</div>

				<div class="flex items-center justify-end gap-2 border-t border-border pt-3 mt-1">
					<button
						type="button"
						class="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-surface-sunken text-fg transition-colors cursor-pointer"
						onclick={() => (showAdvanced = false)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="px-4 py-1.5 text-xs font-semibold rounded-md bg-accent text-accent-fg hover:bg-accent-hover transition-colors shadow-sm cursor-pointer"
						onclick={submitAdvanced}
					>
						Search
					</button>
				</div>
			</div>
		{/if}
	</form>
{/if}
