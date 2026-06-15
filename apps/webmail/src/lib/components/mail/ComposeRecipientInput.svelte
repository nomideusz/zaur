<script lang="ts">
	import { TagsInput } from '@ark-ui/svelte/tags-input';
	import RiCloseLine from 'svelte-remixicon/RiCloseLine.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { listContacts } from '$lib/utils/contact-index';
	import { splitAddressList, isAddressValid } from '$lib/utils/addresses';
	import { cn } from '$lib/utils/cn';
	import { focusFirstItem, rovingFocus } from '$lib/utils/roving-focus';

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
	let tags = $state<string[]>(splitAddressList(value));
	let pending = $state('');
	let lastEmitted = value;

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
	let listEl = $state<HTMLDivElement | null>(null);

	const partial = $derived(pending.trim());
	const suggestions = $derived.by(() => {
		if (!settings.showComposeContactSuggestions || partial.length < 1) return [];
		const existing = new Set(tags.map((tag) => tag.toLowerCase()));
		return listContacts(auth.client?.getAccountId() ?? null, partial)
			.filter((contact) => !existing.has(contact.email.toLowerCase()))
			.slice(0, 6);
	});
	const showSuggestions = $derived(open && suggestions.length > 0);

	function pick(email: string) {
		if (!tags.some((tag) => tag.toLowerCase() === email.toLowerCase())) {
			tags = [...tags, email];
		}
		pending = '';
		emit();
		open = false;
		if (id) document.getElementById(id)?.focus();
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
		onblur?.(event);
	}

	function onWrapperKeydown(event: KeyboardEvent) {
		if (!showSuggestions) return;
		if (event.key === 'ArrowDown' && event.target === inputElement) {
			event.preventDefault();
			focusFirstItem(listEl);
		} else if (event.key === 'Escape') {
			open = false;
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
>
	<TagsInput.Root
		class={cn('z-compose__recipients', className)}
		value={tags}
		ids={id ? { input: id } : undefined}
		delimiter={/[,;]/}
		blurBehavior="add"
		addOnPaste
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
			/>
		</TagsInput.Control>
		<TagsInput.HiddenInput />
	</TagsInput.Root>

	{#if showSuggestions}
		<!-- Contacts are filtered in `suggestions`; this list just needs roving focus.
		     mousedown is prevented so picking a contact doesn't blur the input before
		     the click lands. -->
		<div
			bind:this={listEl}
			id={id ? `${id}-suggestions` : undefined}
			role="listbox"
			aria-label="Contact suggestions"
			use:rovingFocus
			class="absolute left-0 top-full z-20 mt-2 w-full max-w-md overflow-hidden rounded-md border border-border bg-surface-raised shadow-md"
		>
			<div class="max-h-64 overflow-y-auto py-1.5">
				{#each suggestions as contact (contact.email)}
					<button
						type="button"
						data-roving-item
						class="flex w-full cursor-pointer select-none items-center gap-2 px-3 py-2 text-left text-sm outline-none focus:bg-surface-sunken hover:bg-surface-sunken"
						onclick={() => pick(contact.email)}
						onmousedown={(e) => e.preventDefault()}
					>
						<span class="min-w-0 truncate">
							<span class="font-medium text-fg">{contact.name}</span>
							{#if contact.name.trim().toLowerCase() !== contact.email.trim().toLowerCase()}
								<span class="ml-1 text-fg-muted">{contact.email}</span>
							{/if}
						</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
