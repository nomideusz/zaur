<script lang="ts">
	import type { MailboxDTO } from '#lib/mail/types';
	import { channelStyle, mailboxChannel } from '#lib/mail/colors';
	import ZaurMark from './ZaurMark.svelte';

	interface Props {
		mailboxes: MailboxDTO[] | undefined;
		activeMailboxId: string | null;
		onSelectMailbox: (id: string) => void;
		onNewMessage: () => void;
		/** Set when the sidebar is a phone drawer: it gets its own header and a way to close. */
		onClose?: () => void;
	}

	let { mailboxes, activeMailboxId, onSelectMailbox, onNewMessage, onClose }: Props = $props();
</script>

<aside
	class="flex h-full w-full shrink-0 flex-col border-r border-[var(--z-line)] bg-[var(--z-surface)] select-none"
	aria-label="Mailboxes"
>
	{#if onClose}
		<!-- Drawer header: the drawer is a screen of its own on a phone. -->
		<div class="flex h-[52px] shrink-0 items-center justify-between border-b border-[var(--z-hairline)] px-3">
			<ZaurMark />
			<button type="button" class="z-icon-btn !size-8 !rounded-[8px]" aria-label="Close folder list" onclick={onClose}>
				<svg class="size-[13px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
			</button>
		</div>
	{/if}

	<div class="flex-1 overflow-y-auto px-3 py-4">
		<h2 class="z-caption mb-[9px] px-1.5">Mailboxes</h2>
		<ul class="flex flex-col gap-[3px]" role="list">
			{#if mailboxes}
				{#each mailboxes as mailbox (mailbox.id)}
					{@const isSelected = mailbox.id === activeMailboxId}
					{@const channel = mailboxChannel(mailbox.kind)}
					<li>
						<!--
							A checkbox row in the folder's channel: the open folder takes the
							channel's fill and stroke, its rail lights, its box fills with the
							channel's solid. A closed folder is plain, and the box says so.
						-->
						<button
							type="button"
							class="z-railed flex w-full items-center gap-2.5 rounded-[8px] border py-[7px] pr-2 pl-[18px] text-left text-[13.5px] transition-[background-color,border-color] duration-[120ms] {isSelected
								? 'z-hue-wash font-semibold'
								: 'border-transparent font-medium text-[var(--z-strong)] hover:bg-[var(--z-hover)]'}"
							style="{channelStyle(channel)};--z-check:{channel.solid};--z-rail-inset:6px;--z-rail-strength:{isSelected ? '1' : '0'}"
							style:color={isSelected ? channel.ink : undefined}
							aria-current={isSelected ? 'true' : undefined}
							onclick={() => onSelectMailbox(mailbox.id)}
						>
							<span class="hobday-checkbox" data-checked={isSelected} aria-hidden="true">
								<svg class="size-[11px]" viewBox="0 0 16 16" fill="none">
									<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</span>
							<span class="min-w-0 flex-1 truncate">{mailbox.name}</span>
							{#if mailbox.unread > 0}
								<span
									class="z-count"
									style:--z-stroke={isSelected ? channel.stroke : 'var(--z-line)'}
									style:--z-ink-on={isSelected ? channel.ink : 'var(--z-muted)'}
								>
									{mailbox.unread}
								</span>
							{/if}
						</button>
					</li>
				{/each}
			{:else}
				{#each ['Inbox', 'Drafts', 'Sent', 'Archive', 'Trash'] as name (name)}
					<li class="z-skeleton h-[33px] rounded-[8px] bg-[var(--z-sunken)]"></li>
				{/each}
			{/if}
		</ul>
	</div>

	<!-- New message: the one filled control in the sidebar, with its key. -->
	<div class="border-t border-[var(--z-hairline)] p-3">
		<button
			type="button"
			class="btn-tactile btn-primary h-[34px] w-full text-[13px] max-md:h-10 max-md:text-[14px]"
			onclick={onNewMessage}
			title="New message (c)"
		>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
			</svg>
			<span>New message</span>
			<kbd class="z-kbd z-kbd-inverse !h-[18px] max-md:hidden" aria-hidden="true">c</kbd>
		</button>
	</div>
</aside>
