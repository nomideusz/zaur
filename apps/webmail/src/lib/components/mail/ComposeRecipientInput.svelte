<script lang="ts">
	import { untrack } from 'svelte';
	import { TagsInput } from '@ark-ui/svelte/tags-input';
	import { Listbox, createListCollection } from '@ark-ui/svelte/listbox';
	import RiCloseLine from 'svelte-remixicon/RiCloseLine.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { listContacts } from '$lib/utils/contact-index';
	import { splitAddressList, isAddressValid } from '$lib/utils/addresses';
	import { cn } from '$lib/utils/cn';

	interface Props {
		id?: string;
		value: string;
		placeholder?: string;
		class?: string;
		autocomplete?: string;
		invalid?: boolean;
		ariaDescribedby?: string;
		/** The underlying text input, exposed so the parent can focus the field. */
		inputElement?: HTMLInputElement | null;
		autofocus?: boolean;
		oninput?: (value: string) => void;
		onfocus?: () => void;
		onblur?: (event: FocusEvent) => void;
	}

	let {
		id,
		value,
		placeholder = '',
		class: className,
		autocomplete,
		invalid = false,
		ariaDescribedby,
		inputElement = $bindable(null),
		autofocus = false,
		oninput,
		onfocus,
		onblur
	}: Props = $props();

	// The parent still models recipients as a single comma/semicolon string; we
	// render them as chips. `tags` mirrors the committed chip values and `pending`
	// is text typed but not yet committed. We always emit `tags + pending` joined
	// back into a string, so validation/send see exactly what's visible. `lastEmitted`
	// guards against echoing our own emission back in as an external change — without
	// it, the round-trip would re-split the emitted string and turn pending text into
	// a chip on every keystroke.
	let tags = $state<string[]>(splitAddressList(untrack(() => value)));
	let pending = $state('');
	let lastEmitted = untrack(() => value);

	$effect(() => {
		// Resync only on genuine external changes (reply/forward prefill, draft load,
		// clear-after-send) — never on the string we just emitted ourselves.
		if (value !== lastEmitted) {
			tags = splitAddressList(value);
			pending = '';
			lastEmitted = value;
		}
	});

	function emit() {
		const parts = [...tags];
		const tail = pending.trim();
		if (tail) parts.push(tail);
		const next = parts.join(', ');
		lastEmitted = next;
		oninput?.(next);
	}

	let open = $state(false);
	let wrapperEl = $state<HTMLDivElement | null>(null);
	/**
	 * Index of the highlighted suggestion, or -1 for none. The suggestion list is
	 * an Ark Listbox for correct option semantics, but focus stays in the tags
	 * input so the user can keep typing — so we drive the highlight from here
	 * rather than letting the listbox own focus (its content is tabIndex -1).
	 */
	let activeIndex = $state(-1);

	const partial = $derived(pending.trim());
	const suggestions = $derived.by(() => {
		if (!settings.showComposeContactSuggestions || partial.length < 1) return [];
		const existing = new Set(tags.map((tag) => tag.toLowerCase()));
		return listContacts(auth.client?.getAccountId() ?? null, partial)
			.filter((contact) => !existing.has(contact.email.toLowerCase()))
			.slice(0, 6);
	});
	const showSuggestions = $derived(open && suggestions.length > 0);

	const suggestionCollection = $derived(
		createListCollection({
			items: suggestions,
			itemToValue: (contact) => contact.email,
			itemToString: (contact) => contact.name
		})
	);

	const highlightedEmail = $derived(
		activeIndex >= 0 ? (suggestions[activeIndex]?.email ?? null) : null
	);

	/*
	 * Keep the highlight in range as the filtered list changes under the query,
	 * and default to the top match so Enter's target is visible — the previous
	 * roving-focus list highlighted the first row the same way.
	 */
	$effect(() => {
		const count = suggestions.length;
		if (count === 0) {
			if (activeIndex !== -1) activeIndex = -1;
			return;
		}
		if (activeIndex < 0 || activeIndex >= count) activeIndex = 0;
	});

	function moveActive(delta: number) {
		const count = suggestions.length;
		if (!count) return;
		const from = activeIndex;
		const next =
			from === -1
				? delta > 0
					? 0
					: count - 1
				: (from + delta + count) % count;
		activeIndex = next;
	}

	function pick(email: string) {
		if (!tags.some((tag) => tag.toLowerCase() === email.toLowerCase())) {
			tags = [...tags, email];
		}
		pending = '';
		// The input is machine-owned (uncontrolled), so clearing `pending` alone leaves
		// the typed partial in the DOM input. Clear it directly and let the machine
		// observe the change via a synthetic input event.
		const el = (id ? (document.getElementById(id) as HTMLInputElement | null) : null) ?? inputElement;
		if (el) {
			el.value = '';
			el.dispatchEvent(new Event('input', { bubbles: true }));
		}
		emit();
		open = false;
		el?.focus();
	}

	/** Chips display the contact's name when the value is `Name <email>`, otherwise the raw address. */
	function chipLabel(raw: string): string {
		const lt = raw.indexOf('<');
		if (lt > 0) {
			const name = raw.slice(0, lt).trim().replace(/^"|"$/g, '');
			if (name) return name;
		}
		return raw;
	}

	function onValueChange(details: { value: string[] }) {
		// The machine commits (delimiter / Enter / blur) or removes a chip. On a
		// commit the count grows and the just-committed text leaves the input, so
		// clear `pending` to avoid emitting it twice; on a removal keep it.
		const committed = details.value.length > tags.length;
		tags = details.value;
		if (committed) pending = '';
		emit();
	}

	function onInputValueChange(details: { inputValue: string }) {
		pending = details.inputValue;
		open = true;
		emit();
	}

	function onWrapperFocusIn() {
		open = true;
		onfocus?.();
	}

	function onWrapperFocusOut(event: FocusEvent) {
		const next = event.relatedTarget as Node | null;
		if (next && wrapperEl?.contains(next)) return; // focus stayed within the field
		open = false;
		commitPending();
		onblur?.(event);
	}

	/**
	 * Leaving the field commits typed-but-uncommitted text as a chip, matching
	 * Enter/delimiter semantics — recipients always end up as pills. Done here
	 * rather than via the machine's blurBehavior, whose insert races the
	 * controlled suggestion pick and could replace it with the raw partial.
	 */
	function commitPending() {
		const part = pending.trim();
		if (!part) return;
		if (!tags.some((tag) => tag.toLowerCase() === part.toLowerCase())) {
			tags = [...tags, part];
		}
		pending = '';
		if (inputElement) {
			inputElement.value = '';
			inputElement.dispatchEvent(new Event('input', { bubbles: true }));
		}
		emit();
	}

	function onWrapperKeydown(event: KeyboardEvent) {
		if (!showSuggestions) return;
		if (event.target !== inputElement) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveActive(1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveActive(-1);
		} else if (event.key === 'Escape') {
			open = false;
		}
	}

	/**
	 * Commit pasted addresses to chips ourselves. The machine's own paste path
	 * relies on the `insertFromPaste` input type (missed by some mobile keyboards)
	 * and doesn't split on newlines, so a pasted address list stayed one blob of
	 * text. Only complete address lists are taken over — pasting a fragment to
	 * finish a half-typed address falls through to the normal browser paste.
	 */
	function onWrapperPaste(event: ClipboardEvent) {
		if (event.target !== inputElement) return;
		const text = event.clipboardData?.getData('text') ?? '';
		const parts = splitAddressList(text);
		if (!parts.length || !parts.every((part) => isAddressValid(part))) return;
		event.preventDefault();
		event.stopPropagation();
		const existing = new Set(tags.map((tag) => tag.toLowerCase()));
		const fresh = parts.filter((part) => !existing.has(part.toLowerCase()));
		if (fresh.length) tags = [...tags, ...fresh];
		pending = '';
		if (inputElement) {
			inputElement.value = '';
			inputElement.dispatchEvent(new Event('input', { bubbles: true }));
		}
		emit();
	}

	function onSuggestionKeydownCapture(event: KeyboardEvent) {
		// While typing with the suggestion list open, Enter should pick the highlighted
		// contact (defaulting to the top one) rather than letting tags-input commit the
		// raw partial text as a chip. Runs in the capture phase so it intercepts the key
		// before the machine's input handler.
		if (
			event.key === 'Enter' &&
			event.target === inputElement &&
			showSuggestions &&
			suggestions.length > 0
		) {
			event.preventDefault();
			event.stopPropagation();
			pick(suggestions[activeIndex >= 0 ? activeIndex : 0].email);
		}
	}

	$effect(() => {
		// Expose the real <input> so the parent's focusComposeTarget() can focus it.
		if (id) inputElement = document.getElementById(id) as HTMLInputElement | null;
	});
</script>

<!-- Container only; keydown is delegated from the input inside for suggestion navigation. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={wrapperEl}
	class="relative min-w-0"
	onfocusin={onWrapperFocusIn}
	onfocusout={onWrapperFocusOut}
	onkeydown={onWrapperKeydown}
	onkeydowncapture={onSuggestionKeydownCapture}
	onpastecapture={onWrapperPaste}
>
	<TagsInput.Root
		class={cn('z-compose__recipients', className)}
		value={tags}
		ids={id ? { input: id } : undefined}
		delimiter={/[,;]/}
		editable={false}
		autoFocus={autofocus}
		{invalid}
		{onValueChange}
		{onInputValueChange}
	>
		<TagsInput.Control class="z-compose__recipients-control">
			{#each tags as tag, index (tag + ' ' + index)}
				<TagsInput.Item
					{index}
					value={tag}
					class={cn('z-compose__chip', !isAddressValid(tag) && 'z-compose__chip--invalid')}
				>
					<TagsInput.ItemPreview class="z-compose__chip-preview">
						<TagsInput.ItemText class="z-compose__chip-text" title={tag}>
							{chipLabel(tag)}
						</TagsInput.ItemText>
						<TagsInput.ItemDeleteTrigger
							class="z-compose__chip-delete"
							aria-label={`Remove ${chipLabel(tag)}`}
						>
							<RiCloseLine />
						</TagsInput.ItemDeleteTrigger>
					</TagsInput.ItemPreview>
					<TagsInput.ItemInput class="z-compose__chip-edit" />
				</TagsInput.Item>
			{/each}
			<TagsInput.Input
				class={cn('z-compose__input z-compose__recipients-input')}
				{placeholder}
				autocomplete={autocomplete as any}
				aria-invalid={invalid || undefined}
				aria-describedby={ariaDescribedby}
				aria-controls={showSuggestions && id ? `${id}-suggestions` : undefined}
				aria-activedescendant={
					showSuggestions && activeIndex >= 0 && id
						? `${id}-suggestion-${activeIndex}`
						: undefined
				}
			/>
		</TagsInput.Control>
		<TagsInput.HiddenInput />

		{#if showSuggestions}
			<!-- Rendered INSIDE TagsInput.Root so the machine doesn't treat clicks on it as
			     "interact outside" (which would blur-commit the raw partial before pick runs).
			     Ark Listbox supplies the option semantics and highlight state; the content
			     is tabIndex -1 so focus stays in the input and typing keeps filtering.
			     mousedown is prevented so picking doesn't blur the input. -->
			<Listbox.Root
				collection={suggestionCollection}
				highlightedValue={highlightedEmail}
				selectionMode="single"
				deselectable
				class="absolute left-0 top-full z-20 mt-2 w-full max-w-md overflow-hidden rounded-md border border-border bg-surface-raised shadow-md"
			>
				<Listbox.Content
					id={id ? `${id}-suggestions` : undefined}
					tabindex={-1}
					aria-label="Contact suggestions"
					class="max-h-64 overflow-y-auto py-1.5 outline-none"
				>
					{#each suggestions as contact, i (contact.email)}
						<Listbox.Item
							item={contact}
							id={id ? `${id}-suggestion-${i}` : undefined}
							class="flex w-full cursor-pointer select-none items-center gap-2 px-3 py-2 text-left text-sm outline-none data-highlighted:bg-surface-sunken data-[state=checked]:bg-surface-sunken hover:bg-surface-sunken"
							onclick={() => pick(contact.email)}
							onmousedown={(e) => {
								// Pick on mousedown (before the input blurs and the list tears down),
								// and preventDefault to keep focus on the input. onclick remains for
								// keyboard activation; pick() dedups.
								e.preventDefault();
								pick(contact.email);
							}}
						>
							<span class="min-w-0 truncate">
								<span class="font-medium text-fg">{contact.name}</span>
								{#if contact.name.trim().toLowerCase() !== contact.email.trim().toLowerCase()}
									<span class="ml-1 text-fg-muted">{contact.email}</span>
								{/if}
							</span>
							<Listbox.ItemIndicator class="sr-only">Selected</Listbox.ItemIndicator>
						</Listbox.Item>
					{/each}
				</Listbox.Content>
			</Listbox.Root>
		{/if}
	</TagsInput.Root>
</div>
