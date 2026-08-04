<script lang="ts">
	import { Avatar } from '@ark-ui/svelte/avatar';
	import { cn } from '$lib/utils/cn';

	interface Props {
		/** Initials / fallback glyph shown while image is missing or fails. */
		fallback: string;
		src?: string | null;
		alt?: string;
		class?: string;
		fallbackClass?: string;
		imageClass?: string;
	}

	let {
		fallback,
		src = null,
		alt = '',
		class: className = '',
		fallbackClass = '',
		imageClass = ''
	}: Props = $props();
</script>

<!--
	Ark Avatar swaps Image ↔ Fallback based on load status. Without `src` only
	Fallback renders (account initials in the switcher / rail).
-->
<Avatar.Root class={cn('z-avatar', className)}>
	<Avatar.Fallback class={cn('z-avatar__fallback', fallbackClass)}>{fallback}</Avatar.Fallback>
	{#if src}
		<Avatar.Image class={cn('z-avatar__image', imageClass)} {src} {alt} />
	{/if}
</Avatar.Root>
