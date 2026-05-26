<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { avatarUrlsForEmail } from '$lib/utils/avatar';

	interface Props {
		name: string;
		email?: string;
		class?: string;
	}

	let { name, email, class: className }: Props = $props();

	let providerIndex = $state(0);
	let urls = $state<string[]>([]);
	let exhausted = $state(false);

	const initials = $derived(
		name
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);

	const src = $derived(exhausted ? null : (urls[providerIndex] ?? null));

	$effect(() => {
		const currentEmail = email;
		providerIndex = 0;
		exhausted = false;
		urls = [];

		if (!currentEmail?.trim()) return;

		let cancelled = false;
		void avatarUrlsForEmail(currentEmail, 128).then((next) => {
			if (!cancelled) urls = next;
		});

		return () => {
			cancelled = true;
		};
	});

	function handleError() {
		if (providerIndex + 1 < urls.length) {
			providerIndex += 1;
			return;
		}
		exhausted = true;
	}
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
	{#if src}
		<img
			{src}
			alt=""
			class="absolute inset-0 size-full object-cover"
			loading="lazy"
			decoding="async"
			referrerpolicy="no-referrer"
			onerror={handleError}
		/>
	{/if}
</div>
