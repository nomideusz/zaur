<script lang="ts">
	import type { MailboxDTO } from '#lib/mail/types';
	import { mailboxTheme } from '#lib/mail/colors';

	interface Props {
		mailboxes: MailboxDTO[] | undefined;
		activeMailboxId: string | null;
		onSelectMailbox: (id: string) => void;
		onNewMessage: () => void;
	}

	let {
		mailboxes,
		activeMailboxId,
		onSelectMailbox,
		onNewMessage
	}: Props = $props();
</script>

<aside
	class="flex h-full w-full shrink-0 flex-col border-r border-[#cbd5e1] bg-white select-none"
	aria-label="Mailboxes"
>
	<!-- Scrollable content area -->
	<div class="flex-1 overflow-y-auto px-4 py-4 space-y-5">
		<!-- Section: Your mailboxes (Hobday: "Your calendars") -->
		<div>
			<h2 class="z-caption mb-2 px-2">Your mailboxes</h2>
			<ul class="space-y-1" role="list">
				{#if mailboxes}
					{#each mailboxes as mailbox (mailbox.id)}
						{@const isSelected = mailbox.id === activeMailboxId}
						{@const colors = mailboxTheme(mailbox.kind)}
						<li>
							<!--
								The open folder is railed and washed in its own colour, the way
								an unread row is in its sender's. It used to be a grey
								highlight, which said "current" in a shell where every other
								current thing says it in colour.
							-->
							<button
								type="button"
								class="z-railed group flex w-full items-center justify-between gap-2.5 rounded-[8px] border py-1.5 pr-2 pl-[18px] text-left text-[14px] transition-[background-color,border-color] duration-[120ms] {isSelected
									? 'z-hue-wash font-semibold text-slate-900'
									: 'border-transparent font-medium text-slate-800 hover:bg-slate-50'}"
								style:--z-rail={colors.check}
								style:--z-check={colors.check}
								style:--z-rail-inset="6px"
								style:--z-rail-strength={isSelected ? '1' : '0'}
								onclick={() => onSelectMailbox(mailbox.id)}
							>
								<span class="flex items-center gap-2.5 min-w-0">
									<span class="hobday-checkbox" data-checked={isSelected} aria-hidden="true">
										<svg class="size-3" viewBox="0 0 16 16" fill="none">
											<path
												d="M3.5 8.5l3 3 6-7"
												stroke="currentColor"
												stroke-width="2.4"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</span>
									<span class="truncate">{mailbox.name}</span>
								</span>

								{#if mailbox.unread > 0}
									<span
										class="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-[4px] border px-1.5 text-[11px] font-semibold tabular-nums"
										style:background-color={isSelected ? '#ffffff' : colors.badgeBg}
										style:border-color={isSelected ? '#cbd5e1' : colors.badgeBorder}
										style:color={isSelected ? '#0f172a' : colors.badgeText}
									>
										{mailbox.unread}
									</span>
								{/if}
							</button>
						</li>
					{/each}
				{:else}
					{#each ['Inbox', 'Drafts', 'Sent', 'Archive', 'Trash'] as name (name)}
						<li class="h-[34px] animate-pulse rounded-[8px] bg-slate-100"></li>
					{/each}
				{/if}
			</ul>
		</div>

	</div>

	<!-- Bottom action bar: new message -->
	<div class="mt-auto border-t border-[#e2e8f0] p-3.5">
		<button
			type="button"
			class="btn-tactile h-[34px] w-full gap-1.5 text-[13px]"
			onclick={onNewMessage}
			title="New message"
		>
			<svg class="size-3.5 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
			</svg>
			<span>New message</span>
		</button>
	</div>

</aside>
