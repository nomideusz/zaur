<script lang="ts">
	import { getContext } from 'svelte';
	import { Switch } from '@ark-ui/svelte/switch';
	import {
		SETTINGS_A11Y,
		type SettingsA11yContext
	} from '$lib/components/settings/settings-control-context';
	import { cn } from '$lib/utils/cn';

	interface Props {
		checked: boolean;
		class?: string;
		disabled?: boolean;
		/** Fallback when not inside SettingsRow. */
		label?: string;
		onchange?: (checked: boolean) => void;
	}

	let {
		checked = $bindable(false),
		class: className = '',
		disabled = false,
		label,
		onchange
	}: Props = $props();

	const a11y = getContext<SettingsA11yContext | undefined>(SETTINGS_A11Y);
</script>

<!--
	Ark splits the switch into Root(label) > Control(track) > Thumb + a focusable
	HiddenInput. The settings <label for={controlId}> targets that input, so the
	control id moves to ids.hiddenInput and the aria-* wiring moves onto the input.
	`.z-switch-root` is display:contents so Control stays the row's flex child.
-->
<Switch.Root
	{checked}
	{disabled}
	class="z-switch-root"
	ids={a11y?.controlId ? { hiddenInput: a11y.controlId } : undefined}
	onCheckedChange={(details) => {
		if (onchange) onchange(details.checked);
		else checked = details.checked;
		// Hidden checkbox focus after tap can nudge mobile browser chrome and shrink dvh.
		const active = document.activeElement;
		if (active instanceof HTMLElement) active.blur();
	}}
>
	<Switch.Control class={cn('z-switch', className)}>
		<Switch.Thumb class="z-switch__thumb" />
	</Switch.Control>
	<Switch.HiddenInput
		aria-label={!a11y?.labelId && label ? label : undefined}
		aria-labelledby={a11y?.labelId}
		aria-describedby={a11y?.descId}
	/>
</Switch.Root>
