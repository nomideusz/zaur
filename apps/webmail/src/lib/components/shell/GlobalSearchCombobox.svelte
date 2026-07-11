<script lang="ts">
	// Single-dropdown global search. One panel does it all: quick-filter chips (idle),
	// "search for…" + contact matches (typing), and an inline collapsible Advanced section —
	// no second floating panel. A plain input (not an Ark combobox) so form fields can live
	// inside the same dropdown without the listbox stealing focus; keyboard nav over the top
	// suggestions is a small roving highlight.
	//   - shell:   input + advanced section + md:hidden icon button
	//   - sidebar: input + suggestions only (no advanced)
	//   - mobile:  plain input, no dropdown
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Highlight } from '@ark-ui/svelte/highlight';
	import { isTypingTarget } from '$lib/utils/keyboard';
	import Search from '$lib/components/icons/Search.svelte';
	import User from '$lib/components/icons/User.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
	import { LABEL_UNSEEN } from '$lib/mail/new-mail';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { listContacts } from '$lib/utils/contact-index';
	import { searchOperatorHint } from '$lib/mail/search-query';
	import { isMailPath } from '$lib/mail/routes';
	import { cn } from '$lib/utils/cn';

	interface Props {
		placement?: 'shell' | 'sidebar' | 'mobile';
		class?: string;
		autofocus?: boolean;
	}

	let { placement = 'shell', class: className = '', autofocus = false }: Props = $props();

	const isSidebar = $derived(placement === 'sidebar');
	const isMobile = $derived(placement === 'mobile');
	const showAdvancedToggle = $derived(placement === 'shell');
	const inputId = $derived(
		isSidebar ? 'sidebar-search' : isMobile ? 'mobile-search' : 'global-search'
	);

	let input = $state('');
	let open = $state(false);
	let advancedExpanded = $state(false);
	let highlightIndex = $state(-1);
	let mobileInput = $state<HTMLInputElement | null>(null);
	let rootEl = $state<HTMLDivElement | null>(null);

	// Advanced search state.
	let advFrom = $state('');
	let advTo = $state('');
	let advSubject = $state('');
	let advText = $state('');
	let advHasAttachment = $state(false);
	let advMailboxId = $state('');
	let advDateRange = $state('any');
	let advAfterDate = $state('');
	let advBeforeDate = $state('');

	$effect(() => {
		// Search is shown in-place on the mailbox list (?q), so mirror it on any mail route.
		if (isMailPath($page.url.pathname)) {
			input = $page.url.searchParams.get('q') ?? '';
		}
	});

	$effect(() => {
		if (!isMobile || !mobileInput) return;
		if (!autofocus && $page.url.searchParams.get('focus') !== '1') return;
		requestAnimationFrame(() => mobileInput?.focus());
	});

	// Reset the keyboard highlight whenever what's typed changes.
	$effect(() => {
		void input;
		highlightIndex = -1;
	});

	// --- Suggestions ---------------------------------------------------------

	type SuggestItem = {
		value: string;
		label: string;
		group: 'filter' | 'search' | 'contact';
		icon: 'attachment' | 'unseen' | 'me' | 'recent' | 'search' | 'contact';
		run: () => void;
	};

	function setQuery(next: string) {
		input = next;
		open = true;
		document.getElementById(inputId)?.focus();
	}

	function composeTo(email: string) {
		open = false;
		input = '';
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}

	const quickFilters = $derived.by<SuggestItem[]>(() => {
		const items: SuggestItem[] = [
			{ value: 'qf:attachment', label: 'Has attachment', group: 'filter', icon: 'attachment', run: () => setQuery('has:attachment') },
			{ value: 'qf:unseen', label: `${LABEL_UNSEEN} messages`, group: 'filter', icon: 'unseen', run: () => setQuery('is:unseen') }
		];
		if (auth.username) {
			items.push({ value: 'qf:me', label: 'Sent by me', group: 'filter', icon: 'me', run: () => setQuery(`from:${auth.username}`) });
		}
		items.push({
			value: 'qf:recent',
			label: 'Received in last 7 days',
			group: 'filter',
			icon: 'recent',
			run: () => {
				const since = new Date();
				since.setDate(since.getDate() - 7);
				setQuery(`after:${since.toISOString().split('T')[0]}`);
			}
		});
		return items;
	});

	const contactMatches = $derived.by<SuggestItem[]>(() => {
		const query = input.trim();
		if (query.length < 1) return [];
		return listContacts(auth.client?.getAccountId() ?? null, query)
			.slice(0, 4)
			.map((contact) => ({
				value: `contact:${contact.email}`,
				label: `${contact.name} ${contact.email}`,
				group: 'contact' as const,
				icon: 'contact' as const,
				run: () => composeTo(contact.email)
			}));
	});

	// The flat list the keyboard navigates: quick filters when idle, else search + contacts.
	const topItems = $derived.by<SuggestItem[]>(() => {
		if (input.trim().length === 0) return quickFilters;
		const searchItem: SuggestItem = {
			value: 'search',
			label: `Search mail for "${input.trim()}"`,
			group: 'search',
			icon: 'search',
			run: () => submit()
		};
		return [searchItem, ...contactMatches];
	});

	function filterEmoji(icon: SuggestItem['icon']): string {
		return icon === 'attachment' ? '📎' : icon === 'unseen' ? '✉️' : icon === 'me' ? '👤' : '📅';
	}

	const placeholder = $derived.by(() => {
		if (isMobile) return 'Search messages…';
		const hint = settings.enableKeyboardShortcuts && !settings.hideComposeHints;
		if (isSidebar) return `Search…${hint ? ' (/)' : ''}`;
		return `Search messages or contacts…${hint ? ' (/ to focus)' : ''}${!settings.hideComposeHints ? ` · ${searchOperatorHint()}` : ''}`;
	});

	function searchPageUrl(focus = false): string {
		return focus ? '/mail/search?focus=1' : '/mail/search';
	}

	function submit(query = input.trim()) {
		if (!query) return;
		open = false;
		advancedExpanded = false;
		// Search renders in-place on the inbox list via ?q (no separate search page).
		goto(`/?${new URLSearchParams({ q: query }).toString()}`);
	}

	// --- Keyboard ------------------------------------------------------------

	function move(delta: number) {
		const n = topItems.length;
		if (n === 0) {
			highlightIndex = -1;
			return;
		}
		highlightIndex =
			highlightIndex < 0 ? (delta > 0 ? 0 : n - 1) : (highlightIndex + delta + n) % n;
	}

	function onInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (advancedExpanded) advancedExpanded = false;
			else open = false;
			return;
		}
		if (advancedExpanded) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!open) open = true;
			else move(1);
		} else if (event.key === 'ArrowUp') {
			if (open) {
				event.preventDefault();
				move(-1);
			}
		}
	}

	function onFormSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (advancedExpanded) {
			submitAdvanced();
			return;
		}
		if (open && highlightIndex >= 0 && highlightIndex < topItems.length) {
			topItems[highlightIndex].run();
			return;
		}
		submit();
	}

	// --- Advanced search -----------------------------------------------------

	const dateRangeOptions = [
		{ value: 'any', label: 'Any time' },
		{ value: '1d', label: 'Last 24 hours' },
		{ value: '7d', label: 'Last 7 days' },
		{ value: '30d', label: 'Last 30 days' },
		{ value: '90d', label: 'Last 90 days' },
		{ value: '1y', label: 'Last year' },
		{ value: 'custom', label: 'Custom range…' }
	];

	const mailboxOptions = $derived([
		{ value: '', label: 'All Mailboxes' },
		...mail.mailboxes.map((mb) => ({ value: mb.jmapId || mb.id, label: mb.name }))
	]);

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
					if (value.toLowerCase() === 'attachment') advHasAttachment = true;
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

		if (textTerms.length) advText = textTerms.join(' ');

		advMailboxId = $page.url.searchParams.get('mailbox') ?? '';
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
		if (advHasAttachment) parts.push('has:attachment');

		let afterStr = '';
		let beforeStr = '';

		if (advDateRange === 'custom') {
			afterStr = advAfterDate;
			beforeStr = advBeforeDate;
		} else if (advDateRange !== 'any') {
			const now = new Date();
			if (advDateRange === '1d') now.setDate(now.getDate() - 1);
			else if (advDateRange === '7d') now.setDate(now.getDate() - 7);
			else if (advDateRange === '30d') now.setDate(now.getDate() - 30);
			else if (advDateRange === '90d') now.setDate(now.getDate() - 90);
			else if (advDateRange === '1y') now.setFullYear(now.getFullYear() - 1);
			afterStr = now.toISOString().split('T')[0];
		}

		if (afterStr) parts.push(`after:${afterStr}`);
		if (beforeStr) parts.push(`before:${beforeStr}`);
		if (advText.trim()) parts.push(advText.trim());

		return parts.join(' ');
	}

	function toggleAdvanced(event?: MouseEvent) {
		event?.stopPropagation();
		open = true;
		if (advancedExpanded) {
			advancedExpanded = false;
		} else {
			populateAdvancedFromInput(input);
			advancedExpanded = true;
		}
	}

	function submitAdvanced() {
		const query = buildQueryFromAdvanced();
		input = query;
		advancedExpanded = false;
		open = false;

		const params = new URLSearchParams({ q: query });
		if (advMailboxId) params.set('mailbox', advMailboxId);
		goto(`/?${params.toString()}`);
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

	// --- Global "/" shortcut + outside click ---------------------------------

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

	function handleWindowClick(event: MouseEvent) {
		if (!open) return;
		const target = event.target;
		if (!(target instanceof Node) || !target.isConnected) return;
		if (rootEl?.contains(target)) return;
		open = false;
		advancedExpanded = false;
	}

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (!settings.enableKeyboardShortcuts) return;
			if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
			if (isTypingTarget(event.target)) return;

			event.preventDefault();
			if (focusVisibleMailSearch()) return;
			const el = document.getElementById(inputId);
			if (el && !isMobile) {
				el.focus();
				open = true;
				return;
			}
			goto(searchPageUrl(true));
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	const itemClass =
		'flex w-full cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-left text-sm outline-none';
	const filterBadge =
		'inline-flex size-4.5 items-center justify-center rounded border border-border bg-surface-sunken text-[11px]';
</script>

<svelte:window onclick={handleWindowClick} />

{#if isMobile}
	<!-- Plain input: the mobile search experience has no dropdown (original isSimpleSearch). -->
	<form
		role="search"
		class={cn('relative w-full min-w-0', className)}
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<label class="sr-only" for={inputId}>Search mail</label>
		<Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
		<input
			bind:this={mobileInput}
			id={inputId}
			type="search"
			data-zaur-mail-search=""
			enterkeyhint="search"
			inputmode="search"
			autocomplete="off"
			{placeholder}
			class="z-sidebar-search-input pr-3"
			bind:value={input}
		/>
	</form>
{:else}
	{#if placement === 'shell'}
		<IconButton label="Search mail" class="md:hidden" onclick={() => goto(searchPageUrl(true))}>
			<Search class="size-4" />
		</IconButton>
	{/if}

	<div
		bind:this={rootEl}
		class={cn(
			'relative w-full min-w-0',
			isSidebar ? className : cn('hidden w-full md:block', className)
		)}
	>
		<label class="sr-only" for={inputId}>Search mail</label>
		<!-- One form so a plain Enter submits, and Enter inside the advanced fields submits the
		     advanced query. -->
		<form role="search" onsubmit={onFormSubmit}>
			<div class="relative">
				<Search
					class="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-fg-subtle"
				/>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					id={inputId}
					type="search"
					data-zaur-mail-search={isSidebar ? '' : undefined}
					enterkeyhint="search"
					inputmode="search"
					autocomplete="off"
					autofocus={autofocus}
					role="combobox"
					aria-expanded={open}
					aria-controls="{inputId}-dropdown"
					{placeholder}
					class={cn(
						isSidebar
							? 'z-sidebar-search-input pr-10'
							: 'z-input z-chrome-field w-full rounded-full pl-9 pr-10 shadow-none'
					)}
					bind:value={input}
					onfocus={() => (open = true)}
					onkeydown={onInputKeydown}
				/>

				{#if showAdvancedToggle}
					<TooltipWrap label="Show advanced search options" side="bottom">
						{#snippet trigger({ props })}
							<button
								{...props}
								type="button"
								class="absolute top-1/2 right-3 z-20 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface-sunken hover:text-fg"
								onclick={toggleAdvanced}
								aria-label="Show advanced search options"
								aria-expanded={advancedExpanded}
							>
								<ChevronDown
									class={cn('size-4 transition-transform duration-200', advancedExpanded && 'rotate-180')}
								/>
							</button>
						{/snippet}
					</TooltipWrap>
				{/if}
			</div>

			{#if open}
				<div
					id="{inputId}-dropdown"
					class="absolute right-0 left-0 top-full z-50 mt-1.5 flex max-h-[min(80vh,36rem)] flex-col overflow-hidden rounded-lg border border-border bg-surface-raised shadow-md"
				>
					{#if !advancedExpanded}
						<div class="overflow-y-auto py-1.5">
							{#if input.trim().length === 0}
								<div
									class="z-type-label px-3 py-1 text-[10px] font-bold tracking-wider text-fg-muted uppercase"
								>
									Quick Filters
								</div>
							{/if}
							{#each topItems as item, i (item.value)}
								{#if item.group === 'contact' && topItems[i - 1]?.group !== 'contact'}
									<div class="z-type-label px-3 py-1.5 text-fg-muted">Contacts</div>
								{/if}
								<button
									type="button"
									class={cn(itemClass, i === highlightIndex && 'bg-surface-sunken')}
									onclick={() => item.run()}
									onmousemove={() => (highlightIndex = i)}
								>
									{#if item.group === 'filter'}
										<span class={filterBadge} aria-hidden="true">{filterEmoji(item.icon)}</span>
										<span>{item.label}</span>
									{:else if item.group === 'search'}
										<Search class="size-4 text-fg-subtle" aria-hidden="true" />
										<span>{item.label}</span>
									{:else}
										<User class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
										<span class="min-w-0 truncate">
											<Highlight
												query={input.trim()}
												text={item.label}
												ignoreCase
												matchAll
												class="z-search-mark"
											/>
										</span>
									{/if}
								</button>
							{/each}
						</div>
					{/if}

					{#if showAdvancedToggle}
						{#if !advancedExpanded}
							<div class="mx-2 h-px bg-border" role="separator"></div>
						{/if}
						<button
							type="button"
							class="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold text-accent outline-none hover:bg-surface-sunken"
							onclick={toggleAdvanced}
							aria-expanded={advancedExpanded}
						>
							<span>Advanced search</span>
							<ChevronDown
								class={cn('size-4 transition-transform duration-200', advancedExpanded && 'rotate-180')}
							/>
						</button>

						{#if advancedExpanded}
							<div class="flex flex-col gap-3 overflow-y-auto border-t border-border p-3 text-sm">
								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-fg-muted">Search in</span>
									<select class="z-select" bind:value={advMailboxId}>
										{#each mailboxOptions as option (option.value)}
											<option value={option.value}>{option.label}</option>
										{/each}
									</select>
								</label>

								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-fg-muted">From</span>
									<input type="text" class="z-input" placeholder="Sender's name or email" bind:value={advFrom} />
								</label>

								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-fg-muted">To</span>
									<input type="text" class="z-input" placeholder="Recipient's name or email" bind:value={advTo} />
								</label>

								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-fg-muted">Subject</span>
									<input type="text" class="z-input" placeholder="Subject line contains" bind:value={advSubject} />
								</label>

								<label class="flex flex-col gap-1">
									<span class="text-xs font-medium text-fg-muted">Keywords / Body</span>
									<input type="text" class="z-input" placeholder="Has the words" bind:value={advText} />
								</label>

								<div class="grid grid-cols-2 gap-3">
									<label class="flex flex-col gap-1">
										<span class="text-xs font-medium text-fg-muted">Date range</span>
										<select class="z-select" bind:value={advDateRange}>
											{#each dateRangeOptions as option (option.value)}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
									</label>

									<div class="flex items-end pb-1">
										<Checkbox
											checked={advHasAttachment}
											label="Has attachment"
											class="z-checkbox-row px-0 py-1.5 text-fg-muted transition-colors hover:text-fg"
											onchange={(checked) => {
												advHasAttachment = checked === true;
											}}
										>
											<span class="text-xs font-medium">Has attachment</span>
										</Checkbox>
									</div>
								</div>

								{#if advDateRange === 'custom'}
									<div class="grid grid-cols-2 gap-3 border-t border-border/50 pt-2">
										<label class="flex flex-col gap-1">
											<span class="text-xs font-medium text-fg-muted">After date</span>
											<input type="date" class="z-input" bind:value={advAfterDate} />
										</label>
										<label class="flex flex-col gap-1">
											<span class="text-xs font-medium text-fg-muted">Before date</span>
											<input type="date" class="z-input" bind:value={advBeforeDate} />
										</label>
									</div>
								{/if}
							</div>

							<div class="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
								<button
									type="button"
									class="cursor-pointer text-xs text-fg-subtle transition-colors hover:text-fg"
									onclick={clearAdvanced}
								>
									Clear all
								</button>
								<button type="button" class="z-btn-primary px-4 py-1.5 text-xs" onclick={submitAdvanced}>
									Search
								</button>
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		</form>
	</div>
{/if}
