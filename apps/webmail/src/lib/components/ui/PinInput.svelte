<script lang="ts">
	import { PinInput } from '@ark-ui/svelte/pin-input';
	import { cn } from '$lib/utils/cn';

	interface Props {
		/** Joined string value (e.g. "123456"). */
		value?: string;
		length?: number;
		disabled?: boolean;
		id?: string;
		/** Accessible name when no visible label is rendered. */
		label?: string;
		class?: string;
		autocomplete?: string;
		onValueChange?: (value: string) => void;
		onComplete?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		length = 6,
		disabled = false,
		id,
		label,
		class: className = '',
		autocomplete = 'one-time-code',
		onValueChange,
		onComplete
	}: Props = $props();

	const slots = $derived(Array.from({ length }, (_, index) => index));

	const pinValue = $derived(Array.from({ length }, (_, index) => value[index] ?? ''));

	function emit(next: string[]) {
		const joined = next.join('').replace(/\s/g, '');
		value = joined;
		onValueChange?.(joined);
	}
</script>

<!--
	Ark PinInput for OTP / TOTP. Exposes a joined string to parents that already
	model codes as a single value.
-->
<PinInput.Root
	class={cn('z-pin-input', className)}
	value={pinValue}
	type="numeric"
	otp
	{disabled}
	blurOnComplete
	ids={id ? { hiddenInput: id } : undefined}
	onValueChange={(details) => emit(details.value)}
	onValueComplete={(details) => onComplete?.(details.valueAsString)}
>
	{#if label}
		<PinInput.Label class="sr-only">{label}</PinInput.Label>
	{/if}
	<PinInput.Control class="z-pin-input__control">
		{#each slots as index (index)}
			<PinInput.Input
				{index}
				class="z-pin-input__slot"
				autocomplete={autocomplete as 'one-time-code'}
			/>
		{/each}
	</PinInput.Control>
	<PinInput.HiddenInput />
</PinInput.Root>
