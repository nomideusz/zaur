<script lang="ts">
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { listContacts } from '$lib/utils/contact-index';
	import { cn } from '$lib/utils/cn';

	interface Props {
		value: string;
		placeholder?: string;
		class?: string;
		autocomplete?: string;
		inputElement?: HTMLInputElement | null;
		oninput?: (value: string) => void;
	}

	let {
		value,
		placeholder = '',
		class: className,
		autocomplete,
		inputElement = $bindable(null),
		oninput
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
</script>

<div class="relative min-w-0 flex-1">
	<input
		bind:this={inputElement}
		type="text"
		class={cn('w-full bg-transparent outline-none placeholder:text-fg-subtle', className)}
		placeholder={placeholder}
		autocomplete={autocomplete as HTMLInputElement['autocomplete']}
		{value}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 120)}
		oninput={(e) => {
			open = true;
			activeIndex = 0;
			emit(e.currentTarget.value);
		}}
		onkeydown={onKeydown}
	/>

	{#if showSuggestions}
		<ul
			class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-surface-raised py-1 shadow-md"
			role="listbox"
		>
			{#each suggestions as contact, index (contact.email)}
				<li role="option" aria-selected={index === activeIndex}>
					<button
						type="button"
						class={cn(
							'flex w-full items-center gap-2 px-3 text-left text-sm hover:bg-surface-sunken',
							settings.compactComposeSuggestions ? 'py-1.5' : 'py-2',
							index === activeIndex && 'bg-surface-sunken'
						)}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => pick(contact.email)}
					>
						{#if settings.showAvatars}
							<Avatar name={contact.name} email={contact.email} class="size-6 text-[10px]" />
						{/if}
						<span class="min-w-0 truncate">
							<span class="text-fg">{contact.name}</span>
							<span class="ml-1 text-fg-muted">{contact.email}</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
