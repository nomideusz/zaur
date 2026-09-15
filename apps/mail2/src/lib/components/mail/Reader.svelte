<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import { renderMessageBody } from '#lib/email/html';
	import type { MessageDetail } from '@zaur/mail-core';
	import EmailHtmlFrame from './EmailHtmlFrame.svelte';
	import { formatBytes, formatReaderTime, typeBadge, initials } from '#lib/mail/rows';
	import { getHobdayTheme, HOBDAY_THEMES } from '#lib/mail/colors';

	interface Props {
		messages: MessageDetail[] | undefined;
		loading: boolean;
		error: unknown;
		onRetry: () => void;
		onCompose: (
			mode: 'reply' | 'replyAll' | 'forward',
			message: MessageDetail,
			anchor: { left: number; top: number; right: number; bottom: number } | null
		) => void;
	}

	let { messages, loading, error, onRetry, onCompose }: Props = $props();

	let earlierExpanded = $state(false);

	$effect(() => {
		// Reset the collapse when a different thread loads.
		void messages?.[0]?.threadId;
		earlierExpanded = false;
	});

	const latest = $derived(messages && messages.length > 0 ? messages[messages.length - 1] : undefined);
	const earlier = $derived(messages && messages.length > 1 ? messages.slice(0, -1) : []);

	const rendered = $derived.by(() => {
		if (!latest) return undefined;
		const result = renderMessageBody({
			bodyHtml: latest.bodyHtml,
			bodyText: latest.bodyText,
			allowExternal: true
		});
		return { ...result, attachments: latest.attachments };
	});

	const senderTheme = $derived(
		latest ? getHobdayTheme(latest.from.email || latest.from.name) : HOBDAY_THEMES.blue
	);

	function recipientsLabel(message: MessageDetail): string {
		const others = [...message.to, ...message.cc].filter(
			(person) => person.email.toLowerCase() !== message.from.email.toLowerCase()
		);
		if (others.length === 0) return 'to me';
		const first = others[0]!;
		const rest = others.length - 1;
		return `to ${first.name || first.email}${rest > 0 ? `, +${rest}` : ''}`;
	}

	function anchorFrom(event: Event) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
	}

	function attachmentBadgeTheme(type: string) {
		const lower = (type || '').toLowerCase();
		if (lower.includes('pdf')) return { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' };
		if (lower.includes('image')) return { bg: '#e0f2fe', border: '#38bdf8', text: '#0369a1' };
		if (lower.includes('zip') || lower.includes('archive')) return { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' };
		return { bg: '#dcfce7', border: '#4ade80', text: '#15803d' };
	}
</script>

<section class="flex h-full min-h-0 flex-col bg-white select-none" aria-label="Message reader">
	{#if error}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 text-center p-6">
			<p class="text-sm font-semibold text-slate-800">Couldn't load the conversation</p>
			<p class="max-w-[320px] text-[13px] leading-relaxed text-slate-500">
				The mail server couldn't be reached.
			</p>
			<button
				type="button"
				class="btn-tactile mt-2"
				onclick={onRetry}
			>
				Retry
			</button>
		</div>
	{:else if loading && !messages}
		<div class="flex flex-1 flex-col gap-5 px-8 pt-8" aria-hidden="true">
			<div class="h-7 w-2/3 animate-pulse rounded bg-slate-100"></div>
			<div class="h-4 w-1/3 animate-pulse rounded bg-slate-100"></div>
			<div class="mt-4 space-y-3">
				<div class="h-3.5 w-full animate-pulse rounded bg-slate-100"></div>
				<div class="h-3.5 w-5/6 animate-pulse rounded bg-slate-100"></div>
				<div class="h-3.5 w-4/6 animate-pulse rounded bg-slate-100"></div>
			</div>
		</div>
	{:else if messages && messages.length === 0}
		<div class="flex flex-1 items-center justify-center p-6">
			<p class="max-w-[320px] text-center text-[13px] leading-relaxed text-slate-500">
				This conversation has no messages.
			</p>
		</div>
	{:else if latest && rendered}
		<!-- Reader Action Toolbar: Hobday-style tactile buttons -->
		<div class="flex h-[46px] shrink-0 items-center justify-between border-b border-[#e2e8f0] px-8">
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="btn-tactile !h-[28px] gap-1.5"
					onclick={(event) => latest && onCompose('reply', latest, anchorFrom(event))}
				>
					<svg class="size-3.5 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M6 3.5L1.5 8 6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						<path d="M1.5 8H10a4 4 0 014 4v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
					<span>Reply</span>
				</button>

				<button
					type="button"
					class="btn-tactile !h-[28px] gap-1.5"
					onclick={(event) => latest && onCompose('replyAll', latest, anchorFrom(event))}
				>
					<svg class="size-3.5 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M6 3.5L1.5 8 6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						<path d="M10 3.5L5.5 8 10 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					<span>Reply all</span>
				</button>

				<button
					type="button"
					class="btn-tactile !h-[28px] gap-1.5"
					onclick={(event) => latest && onCompose('forward', latest, anchorFrom(event))}
				>
					<svg class="size-3.5 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M10 3.5L14.5 8 10 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						<path d="M14.5 8H6a4 4 0 00-4 4v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
					<span>Forward</span>
				</button>

			</div>
		</div>

		<!-- Reader Content Area. The column is left-aligned, not centred: centring
		     it walks the message away from the list it came from and from the
		     Reply buttons above it as the pane gets wider. Slack pools on the
		     right instead, where nothing needs to be reachable. -->
		<div class="min-h-0 flex-1 overflow-y-auto px-8 py-6 select-text">
			<div class="flex max-w-[680px] flex-col gap-6">
				<!-- Conversation Subject -->
				<h1 class="text-[24px] font-bold leading-tight tracking-tight text-slate-900">
					{latest.subject}
				</h1>

				<!-- Sender Identity Card -->
				<div class="flex items-start justify-between gap-3.5 rounded-[8px] border border-[#e2e8f0] bg-slate-50/50 p-3.5">
					<div class="flex items-start gap-3 min-w-0">
						<!-- Sender Avatar Badge (Hobday style) -->
						<div
							class="flex size-9 shrink-0 items-center justify-center rounded-[6px] text-xs font-bold"
							style:background-color={senderTheme.bg}
							style:border="1px solid {senderTheme.border}"
							style:color={senderTheme.text}
						>
							{initials(latest.from.name || latest.from.email, latest.from.email)}
						</div>

						<div class="min-w-0 space-y-0.5">
							<div class="flex items-center gap-2 truncate">
								<span class="text-[14px] font-bold text-slate-900 truncate">
									{latest.from.name || latest.from.email}
								</span>
								{#if latest.from.name && latest.from.email}
									<span class="text-xs text-slate-500 truncate">
										&lt;{latest.from.email}&gt;
									</span>
								{/if}
							</div>
							<div class="text-xs text-slate-500 truncate">
								{recipientsLabel(latest)}
							</div>
						</div>
					</div>

					<time
						class="shrink-0 rounded-[4px] border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 tabular-nums shadow-2xs"
						datetime={latest.receivedAt}
					>
						{formatReaderTime(latest.receivedAt)}
					</time>
				</div>

				<!-- Earlier Messages Banner: Modeled directly after Hobday's "Early May bank holiday" full banner -->
				{#if earlier.length > 0 && !earlierExpanded}
					<button
						type="button"
						class="group flex w-full items-center justify-between gap-4 rounded-[6px] border border-[#d97706] bg-[#fef3c7] px-4 py-2.5 text-left transition-all hover:bg-[#fde68a] shadow-2xs"
						onclick={() => (earlierExpanded = true)}
					>
						<div class="flex items-center gap-2 min-w-0">
							<span class="flex size-5 items-center justify-center rounded-[4px] bg-[#f59e0b] text-[11px] font-bold text-white tabular-nums">
								{earlier.length}
							</span>
							<span class="text-[13px] font-bold text-[#78350f]">
								Earlier {earlier.length === 1 ? 'message' : 'messages'} in this conversation
							</span>
						</div>
						<span class="text-xs font-bold text-[#92400e] underline underline-offset-2">
							Expand history
						</span>
					</button>
				{/if}

				{#if earlierExpanded}
					<div class="space-y-4">
						{#each earlier as message (message.id)}
							<div class="rounded-[8px] border border-[#e2e8f0] bg-slate-50/70 p-4 space-y-2">
								<div class="flex items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
									<div class="flex items-center gap-2 truncate">
										<span class="text-[13px] font-bold text-slate-800">
											{message.from.name || message.from.email}
										</span>
										<span class="text-xs text-slate-500 truncate">&lt;{message.from.email}&gt;</span>
									</div>
									<time class="text-xs text-slate-500 tabular-nums shrink-0" datetime={message.receivedAt}>
										{formatReaderTime(message.receivedAt)}
									</time>
								</div>
								<div class="text-[13.5px] leading-relaxed text-slate-700 whitespace-pre-wrap">
									{message.bodyText}
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Message Body Frame -->
				<div class="text-[14px] leading-relaxed text-slate-800">
					<EmailHtmlFrame html={rendered.html} plain={!rendered.isHtml} />
				</div>

				<!-- Attachments with Hobday-style color-coded file badges -->
				{#if rendered.attachments.length > 0}
					<div class="border-t border-[#e2e8f0] pt-4">
						<div class="mb-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
							Attachments ({rendered.attachments.length})
						</div>
						<div class="flex flex-wrap gap-2.5">
							{#each rendered.attachments as attachment (attachment.blobId)}
								{@const badge = attachmentBadgeTheme(attachment.type)}
								<div
									class="flex h-11 items-center gap-3 rounded-[6px] border border-[#cbd5e1] bg-white px-3 shadow-2xs"
									title={attachment.name}
								>
									<span
										class="flex size-6 items-center justify-center rounded-[4px] text-[10px] font-bold uppercase"
										style:background-color={badge.bg}
										style:border="1px solid {badge.border}"
										style:color={badge.text}
									>
										{typeBadge(attachment.type)}
									</span>
									<span class="max-w-44 truncate text-[13px] font-medium text-slate-800">{attachment.name}</span>
									<span class="text-xs text-slate-400 tabular-nums font-medium">{formatBytes(attachment.size)}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Empty Selection Placeholder -->
		<div class="flex flex-1 items-center justify-center p-6 text-center">
			<div class="max-w-[280px]">
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
					<svg class="size-6" viewBox="0 0 16 16" fill="none">
						<rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.3" />
						<path d="M2 5l6 4 6-4" stroke="currentColor" stroke-width="1.3" />
					</svg>
				</div>
				<p class="text-sm font-semibold text-slate-800">No message selected</p>
				<p class="mt-1 text-xs text-slate-500 leading-relaxed">
					Select an email to read, or navigate with <kbd class="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[11px] font-medium text-slate-600">j</kbd> and <kbd class="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[11px] font-medium text-slate-600">k</kbd>.
				</p>
			</div>
		</div>
	{/if}
</section>
