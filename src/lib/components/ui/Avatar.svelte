<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { gravatarUrl } from '$lib/utils/gravatar';

	interface Props {
		name: string;
		email?: string;
		class?: string;
	}

	let { name, email, class: className }: Props = $props();

	let imageFailed = $state(false);

	const initials = $derived(
		name
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);

	const src = $derived(gravatarUrl(email, 128));

	$effect(() => {
		email;
		imageFailed = false;
	});
</script>

<div
	class={cn(
		'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-sunken text-xs font-medium text-fg-muted',
		className
	)}
	aria-hidden="true"
	title={email ?? name}
>
	{initials}
	{#if src && !imageFailed}
		<img
			{src}
			alt=""
			class="absolute inset-0 size-full object-cover"
			loading="lazy"
			decoding="async"
			referrerpolicy="no-referrer"
			onerror={() => {
				imageFailed = true;
			}}
		/>
	{/if}
</div>
