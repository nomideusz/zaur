<script lang="ts">
	// Ark combobox replacement for GlobalSearch. The combobox machine owns the
	// suggestions dropdown (open state + keyboard nav), dropping the dependency on
	// roving-focus.ts. Placement behaviour matches the original:
	//   - shell:   combobox + advanced-search toggle + md:hidden icon button
	//   - sidebar: combobox suggestions only
	//   - mobile:  plain input (no dropdown), like the original isSimpleSearch path
	// The advanced-search panel is plain form markup rendered as a sibling overlay;
	// while it is open the combobox popup is forced closed.
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Combobox, createListCollection } from '@ark-ui/svelte/combobox';
	import { Portal } from '@ark-ui/svelte/portal';
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
	let showAdvanced = $state(false);
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
		if ($page.url.pathname === '/mail/search') {
			input = $page.url.searchParams.get('q') ?? '';
		}
	});

	$effect(() => {
		if (!isMobile || !mobileInput) return;
		if (!autofocus && $page.url.searchParams.get('focus') !== '1') return;
		requestAnimationFrame(() => mobileInput?.focus());
	});

	// --- Suggestions (combobox) ---------------------------------------------

	type SuggestItem = {
		value: string;
		label: string;
		group: 'filter' | 'search' | 'contact' | 'advanced';
		icon: 'attachment' | 'unseen' | 'me' | 'recent' | 'search' | 'contact' | 'advanced';
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
		// The "Advanced Search Options" entry only exists on shell (matches original).
		if (showAdvancedToggle) {
			items.push({
				value: 'qf:advanced',
				label: 'Advanced Search Options',
				group: 'advanced',
				icon: 'advanced',
				run: () => openAdvanced()
			});
		}
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

	const items = $derived.by<SuggestItem[]>(() => {
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

	const collection = $derived(
		createListCollection({
			items,
			itemToValue: (item) => item.value,
			itemToString: (item) => item.label
		})
	);
	const byValue = $derived(new Map(items.map((item) => [item.value, item])));

	// Render slices (the collection stays flat for correct keyboard nav order).
	const filterItems = $derived(items.filter((i) => i.group === 'filter'));
	const advancedItem = $derived(items.find((i) => i.group === 'advanced'));
	const searchAction = $derived(items.find((i) => i.group === 'search'));
	const contactItems = $derived(items.filter((i) => i.group === 'contact'));

	const popupOpen = $derived(open && !showAdvanced && items.length > 0);

	function onInputValueChange(details: Combobox.InputValueChangeDetails) {
		if (details.reason === 'input-change') input = details.inputValue;
	}

	function onSelect(details: Combobox.SelectionDetails) {
		byValue.get(details.itemValue)?.run();
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
		showAdvanced = false;
		goto(`/mail/search?${new URLSearchParams({ q: query }).toString()}`);
	}

	// --- Advanced search (ported verbatim) ----------------------------------

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

	function openAdvanced() {
		populateAdvancedFromInput(input);
		showAdvanced = true;
		open = false;
	}

	function toggleAdvanced(event: MouseEvent) {
		event.stopPropagation();
		if (!showAdvanced) openAdvanced();
		else showAdvanced = false;
	}

	function submitAdvanced() {
		const query = buildQueryFromAdvanced();
		input = query;
		showAdvanced = false;
		open = false;

		const params = new URLSearchParams({ q: query });
		if (advMailboxId) params.set('mailbox', advMailboxId);
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

	// --- Global "/" shortcut -------------------------------------------------

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

	// The advanced panel isn't a dismissable layer the combobox manages, so it keeps
	// its own click-outside. The combobox handles outside-clicks for the popup itself.
	function handleWindowClick(event: MouseEvent) {
		if (!showAdvanced) return;
		const target = event.target;
		if (!(target instanceof Node)) return;
		if (!target.isConnected) return;
		if (rootEl?.contains(target)) return;
		showAdvanced = false;
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
		'flex w-full cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-left text-sm outline-none data-[highlighted]:bg-surface-sunken';
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

	<Combobox.Root
		bind:ref={rootEl}
		{collection}
		ids={{ input: inputId }}
		inputValue={input}
		open={popupOpen}
		multiple={false}
		openOnClick
		allowCustomValue
		selectionBehavior="preserve"
		closeOnSelect={false}
		positioning={{ placement: 'bottom-start', sameWidth: true }}
		onInputValueChange={onInputValueChange}
		onOpenChange={(d) => (open = d.open)}
		onSelect={onSelect}
		class={cn(
			'relative w-full min-w-0',
			isSidebar ? className : cn('hidden w-full md:block', className)
		)}
	>
		<Combobox.Label class="sr-only">Search mail</Combobox.Label>

		<!-- Wrapped in a form so a plain Enter (nothing highlighted) submits; ArrowDown
		     into the list + Enter routes through onSelect. The advanced panel lives in the
		     same form so Enter inside its fields submits the advanced query. -->
		<form
			role="search"
			onsubmit={(e) => {
				e.preventDefault();
				if (showAdvanced) submitAdvanced();
				else submit();
			}}
		>
			<Combobox.Control class="relative">
				<Search
					class="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-fg-subtle"
				/>
				<Combobox.Input
					type="search"
					data-zaur-mail-search={isSidebar ? '' : undefined}
					enterkeyhint="search"
					inputmode="search"
					autocomplete="off"
					autofocus={autofocus}
					{placeholder}
					class={cn(
						isSidebar
							? 'z-sidebar-search-input pr-10'
							: 'z-input z-chrome-field w-full rounded-full pl-9 pr-10 shadow-none'
					)}
					onfocus={() => {
						if (!showAdvanced) open = true;
					}}
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
							>
								<ChevronDown
									class={cn('size-4 transition-transform duration-200', showAdvanced && 'rotate-180')}
								/>
							</button>
						{/snippet}
					</TooltipWrap>
				{/if}
			</Combobox.Control>

			{#if showAdvanced}
				<div
					class="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-md"
				>
					<div
						class="flex max-h-[min(75vh,34rem)] flex-col overflow-hidden text-sm"
						role="dialog"
						tabindex="-1"
						aria-label="Advanced search"
						onkeydown={(event) => {
							if (event.key === 'Escape') {
								showAdvanced = false;
								document.getElementById(inputId)?.focus();
							}
						}}
					>
						<div class="flex items-center justify-between border-b border-border px-3 py-2">
							<span class="font-semibold text-fg">Advanced search</span>
							<button
								type="button"
								class="cursor-pointer text-xs text-fg-subtle transition-colors hover:text-fg"
								onclick={clearAdvanced}
							>
								Clear all
							</button>
						</div>

						<div class="flex flex-col gap-3 overflow-y-auto p-3">
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

						<div class="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
							<button
								type="button"
								class="cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-surface-sunken"
								onclick={() => {
									showAdvanced = false;
									document.getElementById(inputId)?.focus();
								}}
							>
								Cancel
							</button>
							<button type="button" class="z-btn-primary px-4 py-1.5 text-xs" onclick={submitAdvanced}>
								Search
							</button>
						</div>
					</div>
				</div>
			{/if}
		</form>

		<Portal>
			<Combobox.Positioner>
				<Combobox.Content
					class="z-50 mt-1.5 max-h-[min(50vh,20rem)] overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-surface-raised py-1.5 shadow-md outline-none"
				>
					{#if input.trim().length === 0}
						<Combobox.ItemGroup>
							<Combobox.ItemGroupLabel
								class="z-type-label px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-fg-muted"
							>
								Quick Filters
							</Combobox.ItemGroupLabel>
							{#each filterItems as item (item.value)}
								<Combobox.Item {item} class={itemClass}>
									<span class={filterBadge} aria-hidden="true">
										{item.icon === 'attachment' ? '📎' : item.icon === 'unseen' ? '✉️' : item.icon === 'me' ? '👤' : '📅'}
									</span>
									<Combobox.ItemText>{item.label}</Combobox.ItemText>
								</Combobox.Item>
							{/each}
						</Combobox.ItemGroup>

						{#if advancedItem}
							<div class="mx-2 my-1 h-px bg-border" role="separator"></div>
							<Combobox.Item
								item={advancedItem}
								class="flex w-full cursor-pointer select-none items-center justify-center gap-1 px-3 py-1.5 text-center text-xs font-semibold text-accent outline-none data-[highlighted]:bg-surface-sunken"
							>
								<Combobox.ItemText>{advancedItem.label}</Combobox.ItemText>
							</Combobox.Item>
						{/if}
					{:else}
						{#if searchAction}
							<Combobox.Item item={searchAction} class={cn(itemClass, 'py-2')}>
								<Search class="size-4 text-fg-subtle" aria-hidden="true" />
								<Combobox.ItemText>{searchAction.label}</Combobox.ItemText>
							</Combobox.Item>
						{/if}

						{#if contactItems.length}
							<Combobox.ItemGroup>
								<Combobox.ItemGroupLabel class="z-type-label px-3 py-1.5 text-fg-muted">
									Contacts
								</Combobox.ItemGroupLabel>
								{#each contactItems as item (item.value)}
									<Combobox.Item {item} class={cn(itemClass, 'py-2')}>
										<User class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
										<Combobox.ItemText class="min-w-0 truncate">{item.label}</Combobox.ItemText>
									</Combobox.Item>
								{/each}
							</Combobox.ItemGroup>
						{/if}
					{/if}
				</Combobox.Content>
			</Combobox.Positioner>
		</Portal>
	</Combobox.Root>
{/if}
