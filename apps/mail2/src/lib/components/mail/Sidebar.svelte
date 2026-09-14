<script lang="ts">
	import type { MailboxDTO } from '#lib/mail/types';
	import { HOBDAY_THEMES } from '#lib/mail/colors';

	interface Props {
		mailboxes: MailboxDTO[] | undefined;
		activeMailboxId: string | null;
		onSelectMailbox: (id: string) => void;
		activeCategories: Set<string>;
		onToggleCategory: (category: string) => void;
		onNewMessage: () => void;
		onManageFolders?: () => void;
	}

	let {
		mailboxes,
		activeMailboxId,
		onSelectMailbox,
		activeCategories,
		onToggleCategory,
		onNewMessage,
		onManageFolders
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

	const categories = [
		{ id: 'personal', name: 'Personal', color: HOBDAY_THEMES.blue },
		{ id: 'work', name: 'Work', color: HOBDAY_THEMES.green },
		{ id: 'team', name: 'Annie and Anthony', color: HOBDAY_THEMES.pink },
		{ id: 'pet', name: 'Pet care', color: HOBDAY_THEMES.purple }
	];

	const readOnlyCalendars = [
		{ id: 'uk-holidays', name: 'UK Holidays', color: HOBDAY_THEMES.amber }
	];
</script>

<aside
	class="flex h-full w-[240px] shrink-0 flex-col border-r border-[#cbd5e1] bg-white select-none"
	aria-label="Mailboxes and Categories"
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

		<!-- Section: Shared / Categories (Hobday: "Shared calendars") -->
		<div>
			<h2 class="mb-2 text-[13px] font-medium text-slate-500">
				Shared mailboxes
			</h2>
			<ul class="space-y-1" role="list">
				{#each categories as cat (cat.id)}
					{@const isChecked = activeCategories.has(cat.id)}
					<li>
						<button
							type="button"
							class="group flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left text-[14px] font-medium text-slate-800 transition-colors duration-[120ms] hover:bg-slate-50"
							onclick={() => onToggleCategory(cat.id)}
						>
							<span
								class="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] transition-all duration-[120ms] {isChecked
									? 'border-transparent text-white'
									: 'border-[1.5px] border-[#94a3b8] bg-white text-transparent group-hover:border-slate-500'}"
								style:background-color={isChecked ? cat.color.checkboxBg : undefined}
								data-checked={isChecked}
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
							<span class="truncate">{cat.name}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Section: Read-only calendars (Hobday: "Read-only calendars") -->
		<div>
			<h2 class="mb-2 text-[13px] font-medium text-slate-500">
				Read-only calendars
			</h2>
			<ul class="space-y-1" role="list">
				{#each readOnlyCalendars as cal (cal.id)}
					{@const isChecked = activeCategories.has(cal.id) || true}
					<li>
						<button
							type="button"
							class="group flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left text-[14px] font-medium text-slate-800 transition-colors duration-[120ms] hover:bg-slate-50"
							onclick={() => onToggleCategory(cal.id)}
						>
							<span
								class="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] transition-all duration-[120ms] {isChecked
									? 'border-transparent text-white'
									: 'border-[1.5px] border-[#94a3b8] bg-white text-transparent group-hover:border-slate-500'}"
								style:background-color={isChecked ? cal.color.checkboxBg : undefined}
								data-checked={isChecked}
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
							<span class="truncate">{cal.name}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</div>

	<!-- Bottom Action Bar: [+ Add] and [⚙ Manage] exactly from Anthony Hobday's design -->
	<div class="mt-auto border-t border-[#e2e8f0] p-3.5">
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				class="btn-tactile w-full h-[34px] gap-1.5 text-[13px]"
				onclick={onNewMessage}
				title="Add new message or folder"
			>
				<svg class="size-3.5 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
				<span>Add</span>
			</button>

			<button
				type="button"
				class="btn-tactile w-full h-[34px] gap-1.5 text-[13px]"
				onclick={onManageFolders}
				title="Manage mailboxes and settings"
			>
				<svg class="size-3.5 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path
						d="M8 10a2 2 0 100-4 2 2 0 000 4z"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M13.2 9.5a1.2 1.2 0 00.24 1.34l.05.05a1.44 1.44 0 01-2.04 2.04l-.05-.05a1.2 1.2 0 00-1.34-.24 1.2 1.2 0 00-.73 1.1v.12a1.44 1.44 0 01-2.88 0v-.12a1.2 1.2 0 00-.73-1.1 1.2 1.2 0 00-1.34.24l-.05.05a1.44 1.44 0 01-2.04-2.04l.05-.05a1.2 1.2 0 00.24-1.34 1.2 1.2 0 00-1.1-.73H1.44a1.44 1.44 0 010-2.88h.12a1.2 1.2 0 001.1-.73 1.2 1.2 0 00-.24-1.34l-.05-.05a1.44 1.44 0 012.04-2.04l.05.05a1.2 1.2 0 001.34.24 1.2 1.2 0 00.73-1.1V1.44a1.44 1.44 0 012.88 0v.12a1.2 1.2 0 00.73 1.1 1.2 1.2 0 001.34-.24l.05-.05a1.44 1.44 0 012.04 2.04l-.05.05a1.2 1.2 0 00-.24 1.34 1.2 1.2 0 001.1.73h.12a1.44 1.44 0 010 2.88h-.12a1.2 1.2 0 00-1.1.73z"
						stroke="currentColor"
						stroke-width="1.3"
					/>
				</svg>
				<span>Manage</span>
			</button>
		</div>
	</div>
</aside>
