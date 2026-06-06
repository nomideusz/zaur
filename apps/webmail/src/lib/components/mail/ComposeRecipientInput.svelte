<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { listContacts } from '$lib/utils/contact-index';
	import { cn } from '$lib/utils/cn';

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
	let activeIndex = $state(0);

	const partial = $derived(value.split(/[,;]/).pop()?.trim() ?? '');
	const prefix = $derived(
		partial ? value.slice(0, value.length - partial.length) : value
	);

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
		activeIndex = 0;
	}

	function onKeydown(event: KeyboardEvent) {
		if (!showSuggestions) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			activeIndex = (activeIndex + 1) % suggestions.length;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
		} else if (event.key === 'Enter' && suggestions[activeIndex]) {
			event.preventDefault();
			pick(suggestions[activeIndex].email);
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
		placeholder={placeholder}
		autocomplete={autocomplete as any}
		aria-invalid={invalid || undefined}
		aria-describedby={ariaDescribedby}
		value={value}
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
			activeIndex = 0;
			emit(e.currentTarget.value);
			syncInputHeight(e.currentTarget);
		}}
		onkeydown={onKeydown}
	></textarea>

	{#if showSuggestions}
		<ul
			class="absolute left-0 top-full z-20 mt-2 w-full max-w-md overflow-hidden rounded-md border border-border bg-surface-raised py-1.5 shadow-md"
			role="listbox"
		>
			{#each suggestions as contact, index (contact.email)}
				<li role="option" aria-selected={index === activeIndex}>
					<button
						type="button"
						class={cn(
							'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-sunken',
							index === activeIndex && 'bg-surface-sunken'
						)}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => pick(contact.email)}
					>
						<span class="min-w-0 truncate">
							<span class="font-medium text-fg">{contact.name}</span>
							{#if contact.name.trim().toLowerCase() !== contact.email.trim().toLowerCase()}
								<span class="ml-1 text-fg-muted">{contact.email}</span>
							{/if}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
