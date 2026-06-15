<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { listContacts } from '$lib/utils/contact-index';
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
		inputElement?: HTMLTextAreaElement | null;
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

	let open = $state(false);
	let listEl = $state<HTMLDivElement | null>(null);

	const partial = $derived(value.split(/[,;]/).pop()?.trim() ?? '');
	const prefix = $derived(partial ? value.slice(0, value.length - partial.length) : value);

	const suggestions = $derived.by(() => {
		if (!settings.showComposeContactSuggestions || partial.length < 1) return [];
		return listContacts(auth.client?.getAccountId() ?? null, partial).slice(0, 6);
	});

	const showSuggestions = $derived(open && suggestions.length > 0);

	function emit(next: string) {
		oninput?.(next);
	}

	function pick(email: string) {
		emit(`${prefix}${email}`);
		open = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (!showSuggestions) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			focusFirstItem(listEl);
		} else if (event.key === 'Escape') {
			open = false;
		}
	}

	function fieldLeadingPx(element: HTMLTextAreaElement) {
		const leading = getComputedStyle(element).lineHeight;
		const parsed = Number.parseFloat(leading);
		return Number.isFinite(parsed) ? parsed : element.offsetHeight;
	}

	function syncInputHeight(element: HTMLTextAreaElement) {
		const minHeight = fieldLeadingPx(element);
		element.style.height = 'auto';
		element.style.height = `${Math.max(element.scrollHeight, minHeight)}px`;
	}

	$effect(() => {
		if (!inputElement) return;
		if (value) {
			syncInputHeight(inputElement);
		} else {
			inputElement.style.height = '';
		}
	});
</script>

<div class="relative min-w-0">
	<textarea
		bind:this={inputElement}
		{id}
		class={cn('z-compose-field-input w-full resize-none overflow-hidden', className)}
		rows={1}
		{placeholder}
		autocomplete={autocomplete as any}
		aria-invalid={invalid || undefined}
		aria-describedby={ariaDescribedby}
		aria-controls={showSuggestions ? `${id}-suggestions` : undefined}
		{value}
		onfocus={() => {
			open = true;
			onfocus?.();
		}}
		onblur={(e) => {
			setTimeout(() => (open = false), 120);
			onblur?.(e);
		}}
		oninput={(e) => {
			open = true;
			emit(e.currentTarget.value);
			syncInputHeight(e.currentTarget);
		}}
		onkeydown={onKeydown}
	></textarea>

	{#if showSuggestions}
		<!-- Contacts are filtered externally; this list just needs roving focus
		     (bits Command with shouldFilter=false). mousedown is prevented so picking
		     a contact doesn't blur the textarea before the click lands. -->
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
