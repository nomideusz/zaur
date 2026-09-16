<script lang="ts">
	import type { MailboxDTO } from '#lib/mail/types';
	import { HOBDAY_THEMES } from '#lib/mail/colors';

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

	function mailboxColor(kind: string | undefined): {
		checkedBg: string;
		theme: typeof HOBDAY_THEMES.blue;
	} {
		switch (kind) {
			case 'inbox':
				return { checkedBg: HOBDAY_THEMES.blue.checkboxBg, theme: HOBDAY_THEMES.blue };
			case 'sent':
				return { checkedBg: HOBDAY_THEMES.green.checkboxBg, theme: HOBDAY_THEMES.green };
			case 'drafts':
				return { checkedBg: HOBDAY_THEMES.amber.checkboxBg, theme: HOBDAY_THEMES.amber };
			case 'archive':
				return { checkedBg: '#64748b', theme: HOBDAY_THEMES.purple };
			case 'junk':
			case 'trash':
				return { checkedBg: '#ef4444', theme: HOBDAY_THEMES.pink };
			default:
				return { checkedBg: HOBDAY_THEMES.purple.checkboxBg, theme: HOBDAY_THEMES.purple };
		}
	}

</script>

<aside
	class="flex h-full w-full shrink-0 flex-col border-r border-[#cbd5e1] bg-white select-none"
	aria-label="Mailboxes"
>
	<!-- Scrollable content area -->
	<div class="flex-1 overflow-y-auto px-4 py-4 space-y-5">
		<!-- Section: Your mailboxes (Hobday: "Your calendars") -->
		<div>
			<h2 class="mb-2 text-[13px] font-medium text-slate-500">
				Your mailboxes
			</h2>
			<ul class="space-y-1" role="list">
				{#if mailboxes}
					{#each mailboxes as mailbox (mailbox.id)}
						{@const isSelected = mailbox.id === activeMailboxId}
						{@const { checkedBg } = mailboxColor(mailbox.kind)}
						<li>
							<button
								type="button"
								class="group flex w-full items-center justify-between gap-2.5 rounded-[6px] px-2 py-1.5 text-left text-[14px] font-medium transition-all duration-[120ms] {isSelected
									? 'bg-slate-100 text-slate-900'
									: 'text-slate-800 hover:bg-slate-50'}"
								onclick={() => onSelectMailbox(mailbox.id)}
							>
								<div class="flex items-center gap-2.5 min-w-0">
									<!-- Hobday-style rounded square checkbox (18x18px) -->
									<span
										class="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] transition-all duration-[120ms] {isSelected
											? 'border-transparent text-white'
											: 'border-[1.5px] border-[#94a3b8] bg-white text-transparent group-hover:border-slate-500'}"
										style:background-color={isSelected ? checkedBg : undefined}
										data-checked={isSelected}
										aria-hidden="true"
									>
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
								</div>

								{#if mailbox.unread > 0}
									<span
										class="flex h-5 min-w-[20px] items-center justify-center rounded-[4px] px-1.5 text-[11px] font-semibold tabular-nums {isSelected
											? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
											: 'bg-slate-100 text-slate-600'}"
									>
										{mailbox.unread}
									</span>
								{/if}
							</button>
						</li>
					{/each}
				{:else}
					{#each ['Inbox', 'Drafts', 'Sent', 'Archive', 'Trash'] as name (name)}
						<li class="h-7 animate-pulse rounded bg-slate-100"></li>
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
