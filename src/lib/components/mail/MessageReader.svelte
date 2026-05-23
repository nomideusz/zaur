<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Archive,
		ArrowLeft,
		MoreHorizontal,
		Reply,
		Star,
		Trash2
	} from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		message: MessageDetail;
		mailboxRouteId: string;
		onBack?: () => void;
		onMoved?: () => void;
	}

	let { message, mailboxRouteId, onBack, onMoved }: Props = $props();

	const when = $derived(
		new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(message.receivedAt))
	);

	async function withClient(action: (client: NonNullable<typeof auth.client>) => Promise<void>) {
		if (!auth.client) return;
		try {
			await action(auth.client);
			onMoved?.();
		} catch (error) {
			console.error(error);
		}
	}

	function reply() {
		compose.startReply(message);
		goto('/mail/compose?mode=reply');
	}

	function toggleStar() {
		if (!auth.client) return;
		void mail.toggleStar(auth.client, message);
	}
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
				{#if message.to.length}
					<p class="mt-1 text-xs text-fg-subtle">
						To {message.to.map((addr) => addr.name || addr.email).join(', ')}
					</p>
				{/if}
				<p class="mt-1 text-xs text-fg-subtle">{when}</p>
			</div>

			<div class="flex items-center gap-1">
				<IconButton label={message.starred ? 'Unstar' : 'Star'} onclick={toggleStar}>
					<Star
						class={cn('size-4', message.starred && 'fill-star text-star')}
						aria-hidden="true"
					/>
				</IconButton>
				<IconButton label="Reply" onclick={reply}>
					<Reply class="size-4" />
				</IconButton>
				<IconButton
					label="Archive"
					onclick={() => withClient((client) => mail.moveMessage(client, message, 'archive'))}
				>
					<Archive class="size-4" />
				</IconButton>
				<IconButton
					label="Delete"
					onclick={() => withClient((client) => mail.deleteMessage(client, message, mailboxRouteId))}
				>
					<Trash2 class="size-4" />
				</IconButton>
				<IconButton label="More actions">
					<MoreHorizontal class="size-4" />
				</IconButton>
			</div>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto px-6 py-5">
		<div class="mx-auto max-w-(--z-reader-measure) whitespace-pre-wrap text-sm leading-relaxed text-fg">
			{message.bodyText}
		</div>
	</div>
</article>
