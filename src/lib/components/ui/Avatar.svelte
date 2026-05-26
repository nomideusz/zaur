<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { avatarUrlsForEmail } from '$lib/utils/avatar';
	import { getCachedAvatarUrl, setCachedAvatarUrl } from '$lib/utils/avatar-cache';

	interface Props {
		name: string;
		email?: string;
		class?: string;
	}

	let { name, email, class: className }: Props = $props();

	let providerIndex = $state(0);
	let urls = $state<string[]>([]);
	let exhausted = $state(false);

	const normalizedEmail = $derived(email?.trim().toLowerCase() ?? '');

	const initials = $derived(
		name
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);

	const src = $derived(exhausted ? null : (urls[providerIndex] ?? null));

	$effect(() => {
		const currentEmail = normalizedEmail;
		if (!currentEmail) {
			providerIndex = 0;
			exhausted = false;
			urls = [];
			return;
		}

		const cached = getCachedAvatarUrl(currentEmail);
		if (cached) {
			urls = [cached];
			providerIndex = 0;
			exhausted = false;
			return;
		}

		providerIndex = 0;
		exhausted = false;
		urls = [];

		let cancelled = false;
		void avatarUrlsForEmail(currentEmail, 128).then((next) => {
			if (!cancelled) urls = next;
		});

		return () => {
			cancelled = true;
		};
	});

	function handleLoad(event: Event) {
		const url = (event.currentTarget as HTMLImageElement).currentSrc;
		if (normalizedEmail && url) setCachedAvatarUrl(normalizedEmail, url);
	}

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
			onload={handleLoad}
			onerror={handleError}
		/>
	{/if}
</div>
