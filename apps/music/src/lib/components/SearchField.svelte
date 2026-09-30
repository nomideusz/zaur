<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';

	/**
	 * A search input with a clear button (the shared base styles strip the
	 * browser's own). On touch screens it is 16px and 44 tall: under 16px iOS
	 * zooms the page when the field takes focus. `large` is that size everywhere.
	 */
	let {
		value = $bindable(''),
		large = false,
		class: className = '',
		onclear,
		...rest
	}: Omit<HTMLInputAttributes, 'value'> & { value?: string; large?: boolean; onclear?: () => void } = $props();
	let input: HTMLInputElement;

	function clear() {
		value = '';
		input.focus();
		onclear?.();
	}
</script>

<span class="field {className}" class:large>
	<input class="z-field" type="search" autocomplete="off" bind:this={input} bind:value {...rest} />
	{#if value}
		<button class="z-icon-btn" type="button" aria-label="Clear" onclick={clear}><Icon name="close" /></button>
	{/if}
</span>

<style>
	.field {
		position: relative;
		display: flex;
	}
	input {
		width: 100%;
		height: 36px;
		padding-right: 38px;
	}
	button {
		position: absolute;
		top: 0;
		right: 2px;
		bottom: 0;
		width: 32px;
		height: 32px;
		margin: auto 0;
	}
	.large input {
		height: 44px;
		font-size: 16px;
	}
	@media (pointer: coarse) {
		input {
			height: 44px;
			padding-right: 46px;
			font-size: 16px;
		}
		button {
			right: 0;
			width: 44px;
			height: 44px;
		}
	}
</style>
