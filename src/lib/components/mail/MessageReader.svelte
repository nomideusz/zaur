<script lang="ts">
	import { ArrowLeft, MoreHorizontal, Reply, Shield } from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		message: MessageDetail;
		onBack?: () => void;
	}

	let { message, onBack }: Props = $props();

	const when = $derived(
		new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(message.receivedAt))
	);
</script>

<article class="flex flex-1 flex-col overflow-hidden bg-surface-raised" style="view-transition-name: message-reader;">
	<header class="border-b border-border px-6 py-4">
		<div class="mb-3 flex items-center gap-2 md:hidden">
			{#if onBack}
				<IconButton label="Back to list" onclick={onBack}>
					<ArrowLeft class="size-4" />
				</IconButton>
			{/if}
		</div>

		<h1 class="text-xl font-semibold leading-snug text-fg">{message.subject}</h1>

		<div class="mt-3 flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0 text-sm">
				<p class="font-medium text-fg">{message.from.name}</p>
				<p class="text-fg-muted">{message.from.email}</p>
				<p class="mt-1 text-xs text-fg-subtle">{when}</p>
			</div>

			<div class="flex items-center gap-1">
				<IconButton label="Reply">
					<Reply class="size-4" />
				</IconButton>
				<IconButton label="More actions">
					<MoreHorizontal class="size-4" />
				</IconButton>
			</div>
		</div>
	</header>

	<div class="flex items-center gap-2 border-b border-border bg-surface px-6 py-2 text-xs text-fg-muted">
		<Shield class="size-3.5 shrink-0" aria-hidden="true" />
		External images blocked ·
		<button type="button" class="text-accent hover:underline">Show images once</button>
	</div>

	<div class="flex-1 overflow-y-auto px-6 py-5">
		<div class="mx-auto max-w-(--z-reader-measure) whitespace-pre-wrap text-sm leading-relaxed text-fg">
			{message.bodyText}
		</div>
	</div>
</article>
