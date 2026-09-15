<script lang="ts">
	import { attachmentKind, formatAttachmentSize } from '#lib/compose/attachments';
	import { EDGE, bodyHeightPx, clamp, clampPanel, computeAutoHeight, computeStep, maximizedRect } from '#lib/compose/layout';
	import { filterContacts } from '#lib/compose/recipients';
	import { compose } from '#lib/compose/store.svelte.ts';
	import { initials } from '#lib/mail/rows';
	import type { Draft } from '#lib/compose/types';

	interface Props {
		draft: Draft;
		rootW: number;
		rootH: number;
	}

	let { draft, rootW, rootH }: Props = $props();

	let panelEl = $state<HTMLDivElement | null>(null);
	let headerEl = $state<HTMLElement | null>(null);
	let toInputEl = $state<HTMLInputElement | null>(null);
	let fileInputEl = $state<HTMLInputElement | null>(null);

	const toId = $derived(`compose-to-${draft.id}`);
	const subjectId = $derived(`compose-subject-${draft.id}`);
	const bodyId = $derived(`compose-body-${draft.id}`);
	const listboxId = $derived(`compose-suggestions-${draft.id}`);

	const maximized = $derived(draft.stage === 'maximized');
	const rect = $derived(
		maximized ? maximizedRect(rootW, rootH) : { x: draft.x, y: draft.y, w: draft.w, h: draft.h }
	);
	const height = $derived(maximized ? rect.h : draft.auto ? computeAutoHeight(draft) : rect.h);
	const step = $derived(computeStep(draft));
	const bodyHeight = $derived(bodyHeightPx(draft));
	// Full-strength once the box has grown — an equality check dimmed it at 340 (maximized).
	const bodyOpen = $derived(bodyHeight >= 228);
	const suggestions = $derived(filterContacts(compose.contacts, draft.toInput, draft.to));
	const title = $derived(draft.subject.trim() || 'New message');
	const subjectDim = $derived(draft.to.length === 0 ? 'opacity-68' : 'opacity-100');

	// Focus is requested once per draft (and again when send-without-recipients
	// nudges back to To); the panel consumes it after focusing.
	$effect(() => {
		const target = draft.focusTarget;
		if (!target) return;
		compose.consumeFocus(draft.id);
		const id = target === 'to' ? toId : target === 'subject' ? subjectId : bodyId;
		document.getElementById(id)?.focus();
	});

	// --- window management ---

	let drag: {
		pointerId: number;
		startX: number;
		startY: number;
		originX: number;
		originY: number;
	} | null = null;

	function startDrag(event: PointerEvent) {
		if (event.button !== 0) return;
		compose.raise(draft.id);
		if (draft.stage === 'maximized') compose.toggleMaximize(draft.id);
		drag = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			originX: draft.x,
			originY: draft.y
		};
		compose.setGesture(draft.id, true);
		headerEl?.setPointerCapture(event.pointerId);
	}

	function moveDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		// Clamp against the live size, not the stored one (spec).
		const liveW = panelEl?.offsetWidth ?? rect.w;
		const liveH = panelEl?.offsetHeight ?? height;
		const x = clamp(
			drag.originX + (event.clientX - drag.startX),
			EDGE,
			Math.max(EDGE, rootW - liveW - EDGE)
		);
		const y = clamp(
			drag.originY + (event.clientY - drag.startY),
			EDGE,
			Math.max(EDGE, rootH - liveH - EDGE)
		);
		compose.move(draft.id, x, y);
	}

	function endDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		drag = null;
		compose.setGesture(draft.id, false);
		try {
			headerEl?.releasePointerCapture(event.pointerId);
		} catch {
			// pointer capture was already released
		}
	}

	// --- resize ---

	type ResizeAxis = 'e' | 's' | 'se';
	let resize: {
		axis: ResizeAxis;
		pointerId: number;
		startX: number;
		startY: number;
		origin: { x: number; y: number; w: number; h: number };
	} | null = null;

	function startResize(event: PointerEvent, axis: ResizeAxis) {
		if (event.button !== 0 || draft.stage !== 'default') return;
		event.preventDefault();
		event.stopPropagation();
		compose.raise(draft.id);
		resize = {
			axis,
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			origin: { x: draft.x, y: draft.y, w: draft.w, h: draft.h }
		};
		compose.setGesture(draft.id, true);
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function moveResize(event: PointerEvent) {
		if (!resize || event.pointerId !== resize.pointerId) return;
		const next = { ...resize.origin };
		if (resize.axis !== 's') next.w = resize.origin.w + (event.clientX - resize.startX);
		if (resize.axis !== 'e') next.h = resize.origin.h + (event.clientY - resize.startY);
		compose.setRect(draft.id, clampPanel(next, rootW, rootH));
	}

	function endResize(event: PointerEvent) {
		if (!resize || event.pointerId !== resize.pointerId) return;
		resize = null;
		compose.setGesture(draft.id, false);
	}

	// --- To field ---

	function onToInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		compose.patch(draft.id, {
			toInput: value,
			toOpen: value.trim().length > 0,
			toHi: 0
		});
	}

	function onToKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!draft.toOpen) {
				compose.patch(draft.id, { toOpen: true, toHi: 0 });
				return;
			}
			const count = Math.max(suggestions.length, 1);
			const delta = event.key === 'ArrowDown' ? 1 : -1;
			const next = (draft.toHi + delta + count) % count;
			compose.patch(draft.id, { toHi: next });
			return;
		}
		if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
			const highlighted = suggestions[draft.toHi] ?? null;
			const text = draft.toInput;
			if (!highlighted && !/@/.test(text)) {
				if (event.key === ',') event.preventDefault();
				return;
			}
			event.preventDefault();
			compose.commitTo(draft.id, text, highlighted);
			refocusAfterCommit();
			return;
		}
		if (event.key === 'Escape') {
			if (draft.toOpen) {
				// Closes the suggestion list only — must not minimize the panel.
				event.preventDefault();
				event.stopPropagation();
				compose.patch(draft.id, { toOpen: false });
			}
			return;
		}
		if (event.key === 'Backspace') {
			compose.backspaceRemoveTo(draft.id);
		}
	}

	// Picking a recipient must move focus after the input's own focus
	// restore, hence the double rAF plus a fresh DOM query (spec).
	function refocusAfterCommit() {
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				const id = draft.subject.trim() ? toId : subjectId;
				document.getElementById(id)?.focus();
			})
		);
	}

	function onSubjectKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			compose.patch(draft.id, { bodyOpened: true });
			document.getElementById(bodyId)?.focus();
		}
	}

	function onBodyInput(event: Event) {
		const value = (event.currentTarget as HTMLTextAreaElement).value;
		compose.patch(draft.id, { body: value, bodyOpened: true, sendError: null });
	}

	function removeTo(event: MouseEvent, email: string) {
		event.stopPropagation();
		compose.removeTo(draft.id, email);
	}

	const dotClass = (satisfied: boolean) =>
		`size-[7px] shrink-0 rounded-pill border ${
			satisfied ? 'border-accent bg-accent' : 'border-border-strong bg-container'
		}`;
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	bind:this={panelEl}
	role="dialog"
	tabindex="-1"
	aria-label="Compose: {title}"
	class="absolute flex flex-col overflow-hidden rounded-[10px] border border-[#cbd5e1] bg-white shadow-2xl {draft.gesture
		? 'transition-none'
		: 'transition-[left,top,width,height] duration-[180ms]'}"
	style:left="{rect.x}px"
	style:top="{rect.y}px"
	style:width="{rect.w}px"
	style:height="{height}px"
	style:z-index="{draft.z}"
	onpointerdown={() => compose.raise(draft.id)}
>
	<!-- Header / drag handle -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={headerEl}
		class="flex h-[44px] shrink-0 cursor-grab items-center gap-2.5 border-b border-[#e2e8f0] bg-slate-50/90 px-3.5 select-none active:cursor-grabbing"
		onpointerdown={startDrag}
		onpointermove={moveDrag}
		onpointerup={endDrag}
		onpointercancel={endDrag}
		ondblclick={() => compose.toggleMaximize(draft.id)}
	>
		<!-- Mac dots window controls -->
		<div class="flex items-center gap-1.5 mr-1" aria-hidden="true">
			<button
				type="button"
				class="mac-dot mac-dot-close"
				onpointerdown={(event) => event.stopPropagation()}
				onclick={() => compose.close(draft.id)}
				aria-label="Close"
			></button>
			<button
				type="button"
				class="mac-dot mac-dot-minimize"
				onpointerdown={(event) => event.stopPropagation()}
				onclick={() => compose.minimize(draft.id)}
				aria-label="Minimize"
			></button>
			<button
				type="button"
				class="mac-dot mac-dot-maximize"
				onpointerdown={(event) => event.stopPropagation()}
				onclick={() => compose.toggleMaximize(draft.id)}
				aria-label="Maximize"
			></button>
		</div>

		<span class="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">{title}</span>

		<div class="flex items-center gap-1">
			<button
				type="button"
				class="flex size-6 items-center justify-center rounded-[4px] text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
				aria-label="Minimize"
				onpointerdown={(event) => event.stopPropagation()}
				onclick={() => compose.minimize(draft.id)}
			>
				<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
			</button>
			{#if maximized}
				<button
					type="button"
					class="flex size-6 items-center justify-center rounded-[4px] text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
					aria-label="Restore down"
					onpointerdown={(event) => event.stopPropagation()}
					onclick={() => compose.toggleMaximize(draft.id)}
				>
					<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<rect x="3.5" y="6" width="6.5" height="6.5" rx="1" stroke="currentColor" stroke-width="1.4" />
						<path d="M6.5 3.5h6v6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
					</svg>
				</button>
			{:else}
				<button
					type="button"
					class="flex size-6 items-center justify-center rounded-[4px] text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
					aria-label="Maximize"
					onpointerdown={(event) => event.stopPropagation()}
					onclick={() => compose.toggleMaximize(draft.id)}
				>
					<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.4" />
					</svg>
				</button>
			{/if}
			<button
				type="button"
				class="flex size-6 items-center justify-center rounded-[4px] text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
				aria-label="Close draft"
				onpointerdown={(event) => event.stopPropagation()}
				onclick={() => compose.close(draft.id)}
			>
				<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Fields -->
	<div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
		<!-- To -->
		<div class="flex min-h-[28px] flex-wrap items-start gap-x-3 gap-y-[6px] py-px">
			<span class="flex shrink-0 items-center gap-1.5 pt-1">
				<span class={dotClass(step > 0)} aria-hidden="true"></span>
				<span class="text-[13px] {step === 0 ? 'text-ink' : 'text-ink-secondary'}">To</span>
			</span>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="relative flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-[6px]"
				onclick={() => toInputEl?.focus()}
			>
				{#each draft.to as person (person.email)}
					<span class="flex h-[26px] items-center gap-1.5 rounded-pill border border-[#e2e8e7] bg-canvas pr-1 pl-1.5">
						<span class="flex size-[18px] items-center justify-center rounded-pill bg-accent text-[9px] font-semibold text-accent-fg">
							{initials(person.name, person.email)}
						</span>
						<span class="max-w-[160px] truncate text-[13px]">{person.name || person.email}</span>
						<button
							type="button"
							class="flex size-[18px] items-center justify-center rounded-pill text-ink-secondary transition-colors duration-[160ms] hover:bg-[#e2e8e7]"
							aria-label="Remove {person.name || person.email}"
							onpointerdown={(event) => event.stopPropagation()}
							onclick={(event) => removeTo(event, person.email)}
						>
							<svg class="size-2.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
							</svg>
						</button>
					</span>
				{/each}
				<input
					bind:this={toInputEl}
					id={toId}
					type="text"
					value={draft.toInput}
					oninput={onToInput}
					onkeydown={onToKeydown}
					role="combobox"
					aria-expanded={draft.toOpen}
					aria-autocomplete="list"
					aria-controls={listboxId}
					placeholder={draft.to.length > 0 ? 'Add another' : 'Name or email address'}
					class="h-[26px] min-w-[120px] flex-1 basis-[120px] border-0 bg-transparent text-sm text-ink placeholder:text-ink-secondary focus:outline-none"
				/>
				{#if !draft.ccOpen}
					<button
						type="button"
						class="h-[22px] rounded-pill border border-line px-2 text-[11px] text-ink-secondary transition-colors duration-[160ms] hover:border-border-strong hover:text-ink"
						onclick={() => compose.patch(draft.id, { ccOpen: true })}
					>
						Cc
					</button>
				{/if}
				{#if !draft.bccOpen}
					<button
						type="button"
						class="h-[22px] rounded-pill border border-line px-2 text-[11px] text-ink-secondary transition-colors duration-[160ms] hover:border-border-strong hover:text-ink"
						onclick={() => compose.patch(draft.id, { bccOpen: true })}
					>
						Bcc
					</button>
				{/if}

				{#if draft.toOpen}
					<div
						id={listboxId}
						role="listbox"
						aria-label="Contact suggestions"
						class="absolute top-[calc(100%+4px)] right-[52px] left-[66px] z-5 max-h-[214px] overflow-y-auto rounded-card border border-border bg-container shadow-suggestion"
					>
						{#each suggestions as suggestion, index (suggestion.email)}
							<button
								type="button"
								role="option"
								aria-selected={index === draft.toHi}
								class="flex w-full items-center gap-[9px] rounded-menu-item px-2 py-[7px] text-left {index ===
								draft.toHi
									? 'bg-hairline-cool'
									: ''}"
								onpointerdown={(event) => event.preventDefault()}
								onclick={() => {
									compose.commitTo(draft.id, draft.toInput, suggestion);
									refocusAfterCommit();
								}}
							>
								<span class="flex size-[26px] shrink-0 items-center justify-center rounded-pill bg-accent text-[10px] font-semibold text-accent-fg">
									{initials(suggestion.name, suggestion.email)}
								</span>
								<span class="min-w-0 flex-1 truncate text-[13px]">{suggestion.name || suggestion.email}</span>
								<span class="min-w-0 truncate text-xs text-ink-secondary">{suggestion.email}</span>
								{#if suggestion.meta}
									<span class="shrink-0 text-[11px] text-ink-secondary">{suggestion.meta}</span>
								{/if}
							</button>
						{/each}
						{#if suggestions.length === 0}
							<p class="px-2 py-[7px] text-[13px] text-ink-secondary">
								{draft.toInput.includes('@')
									? `Press Enter to add ${draft.toInput.trim()}`
									: 'No matching contacts'}
							</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		{#if draft.ccOpen}
			<div class="flex h-[45px] items-center gap-3 border-b border-hairline">
				<span class="w-[62px] shrink-0 pl-4 text-[13px] text-ink-secondary">Cc</span>
				<input
					type="text"
					value={draft.cc}
					oninput={(event) =>
						compose.patch(draft.id, { cc: (event.currentTarget as HTMLInputElement).value })}
					placeholder="Copy someone in"
					class="h-7 min-w-0 flex-1 border-0 bg-transparent text-sm text-ink placeholder:text-ink-secondary focus:outline-none"
				/>
				<button
					type="button"
					class="flex size-[22px] shrink-0 items-center justify-center rounded-menu-item text-ink-secondary transition-colors duration-[160ms] hover:bg-divider"
					aria-label="Remove Cc"
					onclick={() => compose.patch(draft.id, { ccOpen: false, cc: '' })}
				>
					<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					</svg>
				</button>
			</div>
		{/if}

		{#if draft.bccOpen}
			<div class="flex h-[45px] items-center gap-3 border-b border-hairline">
				<span class="w-[62px] shrink-0 pl-4 text-[13px] text-ink-secondary">Bcc</span>
				<input
					type="text"
					value={draft.bcc}
					oninput={(event) =>
						compose.patch(draft.id, { bcc: (event.currentTarget as HTMLInputElement).value })}
					placeholder="Hidden recipients"
					class="h-7 min-w-0 flex-1 border-0 bg-transparent text-sm text-ink placeholder:text-ink-secondary focus:outline-none"
				/>
				<button
					type="button"
					class="flex size-[22px] shrink-0 items-center justify-center rounded-menu-item text-ink-secondary transition-colors duration-[160ms] hover:bg-divider"
					aria-label="Remove Bcc"
					onclick={() => compose.patch(draft.id, { bccOpen: false, bcc: '' })}
				>
					<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					</svg>
				</button>
			</div>
		{/if}

		<!-- Subject -->
		<div class="flex h-[45px] items-center gap-3 border-b border-hairline {subjectDim} transition-opacity duration-[160ms]">
			<span class="flex w-[62px] shrink-0 items-center gap-1.5 pl-2">
				<span class={dotClass(step === 2)} aria-hidden="true"></span>
				<span class="text-[13px] {step === 1 ? 'text-ink' : 'text-ink-secondary'}">Subject</span>
			</span>
			<input
				id={subjectId}
				type="text"
				value={draft.subject}
				oninput={(event) =>
					compose.patch(draft.id, {
						subject: (event.currentTarget as HTMLInputElement).value,
						sendError: null
					})}
				onkeydown={onSubjectKeydown}
				placeholder="What is this about?"
				class="h-7 min-w-0 flex-1 border-0 bg-transparent text-sm text-ink placeholder:text-ink-secondary focus:outline-none"
			/>
		</div>

		<!-- Message -->
		<!-- Maximized: the message box flexes to fill the pane instead of a fixed step. -->
		<textarea
			id={bodyId}
			value={draft.body}
			oninput={onBodyInput}
			onfocus={() => compose.patch(draft.id, { bodyOpened: true })}
			class="w-full resize-none border-0 bg-transparent pt-[14px] pb-4 text-[15px] leading-[1.7] text-ink-body focus:outline-none {bodyOpen
				? 'opacity-100'
				: 'opacity-68'} {maximized ? 'min-h-0 flex-1 max-w-[46em]' : 'max-w-[33em]'}"
			style:height={maximized ? undefined : `${bodyHeight}px`}
			style:transition="height 200ms ease"
			aria-label="Message"
		></textarea>

		{#if draft.sendError}
			<p class="pb-2 text-xs text-danger">{draft.sendError}</p>
		{/if}
	</div>

	<!-- Attachment strip -->
	{#if draft.attachments.length > 0}
		<div class="flex max-h-[66px] shrink-0 flex-wrap content-start gap-2 overflow-y-auto pt-3 pb-3 pr-4 pl-4">
			{#each draft.attachments as attachment (attachment.id)}
				<span class="flex h-[30px] shrink-0 items-center gap-2 rounded-control border border-line-light bg-surface-subtle pr-1 pl-2 text-xs">
					<span class="font-mono text-[10px] text-ink-tertiary">
						{attachmentKind(attachment.name, attachment.type)}
					</span>
					<span class="max-w-[180px] truncate {attachment.status === 'error' ? 'text-danger' : ''}">
						{attachment.name}
					</span>
					<span class="shrink-0 text-ink-tertiary">
						{attachment.status === 'uploading'
							? '…'
							: attachment.status === 'error'
								? 'Failed'
								: formatAttachmentSize(attachment.size)}
					</span>
					<button
						type="button"
						class="flex size-[18px] shrink-0 items-center justify-center rounded-full transition-colors duration-[160ms] hover:bg-divider"
						aria-label="Remove {attachment.name}"
						onclick={() => compose.removeAttachment(draft.id, attachment.id)}
					>
						<svg class="size-2.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
						</svg>
					</button>
				</span>
			{/each}
		</div>
	{/if}

	<!-- Action bar -->
	<div class="flex h-[53px] shrink-0 items-center gap-2 border-t border-divider pr-3 pl-4">
		<button
			type="button"
			class="h-9 rounded-btn px-[18px] text-sm transition-colors duration-[160ms] {draft.to.length ===
			0
				? 'bg-divider text-ink-disabled'
				: 'bg-accent text-accent-fg'} disabled:opacity-100"
			disabled={draft.sending}
			onclick={() => void compose.sendDraft(draft.id)}
		>
			{draft.scheduled ? 'Schedule send' : draft.sending ? 'Sending…' : 'Send'}
		</button>
		<button
			type="button"
			class="flex size-8 items-center justify-center rounded-control text-ink-muted transition-colors duration-[160ms] hover:bg-hairline"
			aria-label="Attach a file"
			onclick={() => fileInputEl?.click()}
		>
			<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path
					d="M10.5 7L7.2 10.3a2.2 2.2 0 01-3.1-3.1l4.9-4.9a1.5 1.5 0 012.1 2.1L6.6 8.9a.8.8 0 01-1.1-1.1l3.5-3.5"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		<input
			bind:this={fileInputEl}
			type="file"
			multiple
			class="hidden"
			tabindex={-1}
			aria-hidden="true"
			onchange={(event) => {
				const files = event.currentTarget.files;
				if (files && files.length > 0) compose.attachFiles(draft.id, Array.from(files));
				event.currentTarget.value = '';
			}}
		/>
		<button
			type="button"
			class="h-8 rounded-pill px-2.5 text-xs transition-colors duration-[160ms] {draft.scheduled
				? 'bg-accent-soft text-accent'
				: 'text-ink-muted hover:bg-hairline'}"
			aria-pressed={draft.scheduled}
			onclick={() => compose.toggleSchedule(draft.id)}
		>
			{draft.scheduled ? 'Tomorrow, 09:00' : 'Schedule'}
		</button>
		<button
			type="button"
			class="ml-auto flex size-8 items-center justify-center rounded-control text-ink-muted transition-colors duration-[160ms] hover:bg-hairline"
			aria-label="Discard draft"
			onclick={() => compose.discard(draft.id)}
		>
			<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path
					d="M3.5 5h9M6.5 5V3.5h3V5M5 5l.6 7.5h4.8L11 5"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</div>

	{#if !maximized}
		<!-- Resize: right edge, bottom edge, corner -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute top-[44px] right-0 bottom-3 w-1.5 cursor-ew-resize"
			onpointerdown={(event) => startResize(event, 'e')}
			onpointermove={moveResize}
			onpointerup={endResize}
			onpointercancel={endResize}
		></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute right-3 bottom-0 left-3 h-1.5 cursor-ns-resize"
			onpointerdown={(event) => startResize(event, 's')}
			onpointermove={moveResize}
			onpointerup={endResize}
			onpointercancel={endResize}
		></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute right-0 bottom-0 size-[18px] cursor-nwse-resize"
			role="presentation"
			onpointerdown={(event) => startResize(event, 'se')}
			onpointermove={moveResize}
			onpointerup={endResize}
			onpointercancel={endResize}
		>
			<svg class="absolute right-1 bottom-1" width="7" height="7" viewBox="0 0 7 7" fill="none" aria-hidden="true">
				<path d="M6.5 0.5L0.5 6.5M6.5 4L4 6.5" stroke="#c8c8c8" stroke-width="1.5" stroke-linecap="round" />
			</svg>
		</div>
	{/if}
</div>
