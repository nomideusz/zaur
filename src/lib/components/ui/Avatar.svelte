<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { avatarUrlsForEmail } from '$lib/utils/avatar';
	import { getCachedAvatarUrl, resolveCachedAvatarUrl } from '$lib/utils/avatar-cache';

	interface Props {
		name: string;
		email?: string;
		class?: string;
	}

	let { name, email, class: className }: Props = $props();

	let resolvedSrc = $state<string | null>(null);

	const normalizedEmail = $derived(email?.trim().toLowerCase() ?? '');

	const initials = $derived(
		name
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);

	$effect(() => {
		const currentEmail = normalizedEmail;
		let cancelled = false;

		if (!currentEmail) {
			resolvedSrc = null;
			return;
		}

		const cached = getCachedAvatarUrl(currentEmail);
		if (cached) {
			resolvedSrc = cached;
			return;
		}

		resolvedSrc = null;

		void avatarUrlsForEmail(currentEmail, 128).then((next) => {
			if (cancelled) return;
			void resolveCachedAvatarUrl(currentEmail, next).then((url) => {
				if (!cancelled) resolvedSrc = url;
			});
		});

		return () => {
			cancelled = true;
		};
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
	{#if resolvedSrc}
		<img
			src={resolvedSrc}
			alt=""
			class="absolute inset-0 size-full object-cover"
			loading="lazy"
			decoding="async"
			referrerpolicy="no-referrer"
		/>
	{/if}
</div>
