<script lang="ts">
	import { ACCENT_OPTIONS, type AccentColor } from '$lib/theme/visual';
	import { cn } from '$lib/utils/cn';

	interface Props {
		value: AccentColor;
		onchange: (value: AccentColor) => void;
	}

	let { value, onchange }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Accent color">
	{#each ACCENT_OPTIONS as option (option.id)}
		<button
			type="button"
			role="radio"
			aria-checked={value === option.id}
			aria-label={option.label}
			title={option.label}
			class={cn(
				'size-7 rounded-full border-2 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
				value === option.id ? 'border-fg shadow-sm ring-2 ring-accent/30' : 'border-transparent hover:ring-2 hover:ring-border'
			)}
			style:background-color={option.swatch}
			onclick={() => onchange(option.id)}
		></button>
	{/each}
</div>
