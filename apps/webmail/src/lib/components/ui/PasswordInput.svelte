<script lang="ts">
	import { PasswordInput } from '@ark-ui/svelte/password-input';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	interface Props extends Omit<HTMLInputAttributes, 'type' | 'class' | 'value'> {
		id?: string;
		value?: string;
		class?: string;
		/** Stretch the control to fill a settings field / z-input row. */
		variant?: 'field' | 'plain';
	}

	let {
		id,
		value = $bindable(''),
		class: className = '',
		variant = 'field',
		disabled = false,
		autocomplete,
		...rest
	}: Props = $props();
</script>

<!--
	Ark PasswordInput owns visibility toggle + a11y. Settings/auth pass a stable
	`id` onto the focusable input via ids.input.
-->
<PasswordInput.Root
	ids={id ? { input: id } : undefined}
	disabled={disabled === true}
	class={cn('z-password-input', variant === 'field' && 'z-password-input--field', className)}
>
	<PasswordInput.Control class="z-password-input__control">
		<PasswordInput.Input
			class={cn('z-password-input__input', variant === 'field' && 'z-input')}
			bind:value
			{autocomplete}
			disabled={disabled === true}
			{...rest}
		/>
		<PasswordInput.VisibilityTrigger
			class="z-password-input__toggle"
			tabindex={-1}
			disabled={disabled === true}
		>
			<PasswordInput.Indicator class="inline-flex" fallback={hiddenIcon}>
				<svg
					class="z-password-input__icon"
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

{#snippet hiddenIcon()}
	<svg
		class="z-password-input__icon"
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
			d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
		/>
		<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
	</svg>
{/snippet}
