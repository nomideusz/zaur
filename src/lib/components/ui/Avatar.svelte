<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		name: string;
		email?: string;
		class?: string;
	}

	let { name, email, class: className }: Props = $props();

	const initials = $derived(
		name
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);
</script>

<div
	class={cn(
		'flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-medium text-fg-muted',
		className
	)}
	aria-hidden="true"
	title={email ?? name}
>
	{initials}
</div>
