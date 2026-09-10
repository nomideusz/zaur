<script lang="ts">
	import { goto } from '$app/navigation';
	import { HoverCard } from '@ark-ui/svelte/hover-card';
	import { Portal } from '@ark-ui/svelte/portal';
	import Mail from '$lib/components/icons/Mail.svelte';
	import CopyButton from '$lib/components/ui/CopyButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { findContact, type ContactEntry } from '$lib/utils/contact-index';
	import { hasPreciseHover } from '$lib/utils/pointer-env';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Address to look up — the card is skipped when it isn't in the index. */
		email: string;
		/** Fallback display name when the address is unknown. */
		name?: string;
		class?: string;
		children: Snippet;
	}

	let { email, name, class: className, children }: Props = $props();

	/* Hover previews are a pointer affordance — on touch there is no hover state to
	   trigger them, and a tap must still open the message. */
	let preciseHover = $state(true);
	$effect(() => {
		preciseHover = hasPreciseHover();
	});

	const accountId = $derived(auth.client?.getAccountId() ?? null);
	const contact = $derived<ContactEntry | null>(findContact(accountId, email));

	const displayName = $derived(contact?.name?.trim() || name?.trim() || email);
	const showEmail = $derived(displayName.trim().toLowerCase() !== email.trim().toLowerCase());

	/** Initials for the avatar dot — one letter for a single word, two for "First Last". */
	const initials = $derived.by(() => {
		const parts = displayName.trim().split(/\s+/).filter(Boolean);
		if (!parts.length) return '?';
		if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	});

	const enabled = $derived(preciseHover && !!contact);

	function compose() {
		void goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}
</script>

{#if !enabled}
	{@render children()}
{:else}
	<HoverCard.Root
		openDelay={350}
		closeDelay={120}
		positioning={{ placement: 'top', gutter: 8, overflowPadding: 12 }}
		lazyMount
		unmountOnExit
	>
		<HoverCard.Trigger>
			{#snippet asChild(triggerProps)}
				<span {...triggerProps()} class={cn('inline-flex min-w-0', className)}>
					{@render children()}
				</span>
			{/snippet}
		</HoverCard.Trigger>
		<Portal>
			<HoverCard.Positioner>
				<HoverCard.Content class="z-contact-hover-card">
					<div class="flex items-start gap-3">
						<span class="z-contact-hover-card__avatar" aria-hidden="true">{initials}</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold text-fg">{displayName}</p>
							{#if showEmail}
								<p class="truncate text-xs text-fg-muted">{email}</p>
							{/if}
							{#if contact && contact.count > 0}
								<p class="mt-1 text-xs text-fg-subtle">
									{contact.count} message{contact.count === 1 ? '' : 's'} exchanged
								</p>
							{/if}
						</div>
					</div>
					<div class="z-contact-hover-card__actions">
						<button type="button" class="z-contact-hover-card__action" onclick={compose}>
							<Mail class="size-3.5" aria-hidden="true" />
							New message
						</button>
						<CopyButton
							value={email}
							label="Copy email"
							copiedLabel="Copied"
							class="z-contact-hover-card__action"
						/>
					</div>
				</HoverCard.Content>
			</HoverCard.Positioner>
		</Portal>
	</HoverCard.Root>
{/if}

<style>
	.z-contact-hover-card {
		display: flex;
		min-width: 0;
		width: 17rem;
		max-width: calc(100vw - 1.5rem);
		flex-direction: column;
		gap: 0.75rem;
		border: 1px solid var(--z-border);
		border-radius: var(--radius-md);
		background-color: var(--z-surface-raised);
		padding: 0.75rem;
		box-shadow: var(--shadow-md);
		outline: none;
	}

	.z-contact-hover-card__avatar {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 9999px;
		background-color: color-mix(in srgb, var(--z-accent) 14%, transparent);
		color: var(--z-accent);
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1;
	}

	.z-contact-hover-card__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		border-top: 1px solid var(--z-border);
		padding-top: 0.625rem;
	}

	.z-contact-hover-card__action {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--z-fg-muted);
		cursor: pointer;
		transition:
			color var(--z-motion-fast) var(--z-ease-standard),
			background-color var(--z-motion-fast) var(--z-ease-standard);
	}

	.z-contact-hover-card__action:hover {
		background-color: var(--z-surface-sunken);
		color: var(--z-fg);
	}

	.z-contact-hover-card__action:focus-visible {
		outline: 2px solid var(--z-accent);
		outline-offset: 2px;
	}
</style>
