<script lang="ts">
	import { getContext } from 'svelte';
	import { Switch as BitsSwitch } from 'bits-ui';
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

<BitsSwitch.Root
	id={a11y?.controlId}
	{checked}
	{disabled}
	class={cn('z-switch', className)}
	aria-label={!a11y?.labelId && label ? label : undefined}
	aria-labelledby={a11y?.labelId}
	aria-describedby={a11y?.descId}
	onCheckedChange={(next) => {
		if (onchange) onchange(next);
		else checked = next;
	}}
>
	<BitsSwitch.Thumb class="z-switch__thumb" />
</BitsSwitch.Root>
