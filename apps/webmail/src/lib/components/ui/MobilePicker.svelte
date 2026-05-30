<script lang="ts">
	import { browser } from '$app/environment';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import { cn } from '$lib/utils/cn';

	export interface MobilePickerOption {
		value: string;
		label: string;
	}

	interface Props {
		label: string;
		value: string;
		options: MobilePickerOption[];
		onchange: (value: string) => void;
		compact?: boolean;
		class?: string;
	}

	let {
		label,
		value,
		options,
		onchange,
		compact = false,
		class: className = ''
	}: Props = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);
	let trigger = $state<HTMLButtonElement | null>(null);
	let menuStyle = $state('');

	const selectedLabel = $derived(
		options.find((option) => option.value === value)?.label ?? label
	);
	const menuId = $derived(`${label.replace(/\s+/g, '-').toLowerCase()}-picker-menu`);

	function close() {
		open = false;
	}

	function updateMenuPosition() {
		if (!browser || !trigger) return;
		const rect = trigger.getBoundingClientRect();
		const margin = 8;
		const maxHeight = Math.min(280, window.innerHeight - margin * 2);
		const spaceBelow = window.innerHeight - rect.bottom - margin;
		const openUp = spaceBelow < 160 && rect.top > spaceBelow;
		const top = openUp ? Math.max(margin, rect.top - maxHeight - 4) : rect.bottom + 4;
		const left = Math.max(margin, Math.min(rect.left, window.innerWidth - rect.width - margin));
		const width = Math.min(rect.width, window.innerWidth - margin * 2);

		menuStyle = `top:${top}px;left:${left}px;width:${width}px;max-height:${maxHeight}px;`;
	}

	function toggleOpen(event: MouseEvent) {
		event.stopPropagation();
		open = !open;
		if (open) {
			requestAnimationFrame(updateMenuPosition);
		}
	}

	function selectOption(optionValue: string) {
		close();
		if (optionValue !== value) onchange(optionValue);
	}

	function handleWindowClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Node) || root?.contains(target)) return;
		close();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}

	$effect(() => {
		if (!open || !browser) return;
		const onResize = () => updateMenuPosition();
		window.addEventListener('resize', onResize);
		window.addEventListener('scroll', onResize, true);
		return () => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', onResize, true);
		};
	});
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div bind:this={root} class={cn('relative min-w-0 flex-1', className)}>
	<button
		bind:this={trigger}
		type="button"
		id="{menuId}-trigger"
		class={cn('z-mobile-picker-trigger', compact && 'z-mobile-picker-trigger--compact')}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls={open ? menuId : undefined}
		onclick={toggleOpen}
	>
		<span class="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
		<ChevronDown
			class={cn('size-5 shrink-0 text-fg-subtle transition-transform duration-150', open && 'rotate-180')}
			aria-hidden="true"
		/>
	</button>

	{#if open}
		<ul
			id={menuId}
			role="listbox"
			class="z-mobile-picker-menu"
			style={menuStyle}
			aria-label={label}
		>
			{#each options as option (option.value)}
				<li role="presentation">
					<button
						type="button"
						role="option"
						aria-selected={option.value === value}
						class={cn(
							'z-mobile-picker-option',
							option.value === value && 'z-mobile-picker-option--active'
						)}
						onclick={() => selectOption(option.value)}
					>
						{option.label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
