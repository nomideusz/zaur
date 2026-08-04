<script lang="ts">
	import { PasswordInput } from '@ark-ui/svelte/password-input';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	type InputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';

	interface Props extends Omit<HTMLInputAttributes, 'type' | 'class' | 'placeholder' | 'value'> {
		id: string;
		label: string;
		type?: InputType;
		value?: string;
		placeholder?: string;
		compact?: boolean;
		class?: string;
	}

	let {
		id,
		label,
		type = 'text',
		value = $bindable(''),
		placeholder,
		compact = false,
		disabled = false,
		class: className,
		...rest
	}: Props = $props();

	const isPassword = $derived(type === 'password');
	const isFilled = $derived(value.length > 0);
	const fieldPlaceholder = $derived(placeholder ?? ' ');
</script>

{#if isPassword}
	<!--
		Ark PasswordInput for show/hide; keep floating-label chrome via z-label-input.
		Control is display:contents so Input/Label/Trigger participate in Root focus-within.
		Order is Input → Label → Trigger so the adjacent-sibling float rule still applies.
	-->
	<PasswordInput.Root
		ids={{ input: id }}
		disabled={disabled === true}
		class={cn(
			'z-label-input',
			'z-label-input--password',
			compact && 'z-label-input--compact',
			isFilled && 'is-filled',
			className
		)}
	>
		<PasswordInput.Control class="z-label-input__control">
			<PasswordInput.Input
				{id}
				class="z-label-input__field"
				{value}
				placeholder={fieldPlaceholder}
				disabled={disabled === true}
				{...rest}
				oninput={(event) => {
					value = event.currentTarget.value;
				}}
			/>
			<PasswordInput.Label class="z-label-input__label">{label}</PasswordInput.Label>
			<PasswordInput.VisibilityTrigger class="z-label-input__toggle" tabindex={-1} {disabled}>
				<PasswordInput.Indicator class="inline-flex" fallback={hiddenIcon}>
					<svg
						class="z-label-input__icon"
						viewBox="0 0 24 24"
						width="18"
						height="18"
						aria-hidden="true"
					>
						<path
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M6.12 6.12A18.5 18.5 0 0 0 2 12s3.5 7 10 7a10.94 10.94 0 0 0 5.1-1.24M14.12 14.12a3 3 0 1 1-4.24-4.24"
						/>
						<path
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							d="M3 3l18 18"
						/>
					</svg>
				</PasswordInput.Indicator>
			</PasswordInput.VisibilityTrigger>
		</PasswordInput.Control>
	</PasswordInput.Root>
{:else}
	<div
		class={cn(
			'z-label-input',
			compact && 'z-label-input--compact',
			isFilled && 'is-filled',
			className
		)}
	>
		<input
			{id}
			{type}
			class="z-label-input__field"
			bind:value
			placeholder={fieldPlaceholder}
			{disabled}
			{...rest}
		/>
		<label for={id} class="z-label-input__label">{label}</label>
	</div>
{/if}

{#snippet hiddenIcon()}
	<svg class="z-label-input__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
		<path
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
		/>
		<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
	</svg>
{/snippet}
