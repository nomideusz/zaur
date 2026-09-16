<script lang="ts">
	import { attachmentKind, formatAttachmentSize } from '#lib/compose/attachments';
	import { EDGE, bodyHeightPx, clamp, clampPanel, computeAutoHeight, computeStep, maximizedRect } from '#lib/compose/layout';
	import { filterContacts } from '#lib/compose/recipients';
	import { compose } from '#lib/compose/store.svelte.ts';
	import { initials } from '#lib/mail/rows';
	import { attachmentBadge, getHobdayTheme } from '#lib/mail/colors';
	import Tooltip from '#lib/components/ui/Tooltip.svelte';
	import { Popover } from '@ark-ui/svelte/popover';
	import { Portal } from '@ark-ui/svelte/portal';
	import {
		buildSchedulePresets,
		customSendTimeMin,
		formatScheduleTime,
		isSendAtValid
	} from '#lib/compose/schedule';
	import { viewport } from '#lib/viewport.svelte.ts';
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
	/**
	 * A phone has no window manager either: the panel drops its geometry and
	 * fills the shell. Drag, resize and maximize go with it, and Send moves up
	 * into the header — the action bar sits under the on-screen keyboard.
	 * A shell too short to float a panel in (a phone in landscape, a squat
	 * desktop window) gets the sheet as well.
	 */
	const sheet = $derived(viewport.phone || rootH < 520);
	const filled = $derived(maximized || sheet);
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
	/** Schedule picker state — transient UI, so local state rather than the draft record. */
	let scheduleOpen = $state(false);
	let customSendTime = $state('');
	const schedulePresets = $derived.by(() => {
		void scheduleOpen; // recompute relative times each time the picker opens
		return buildSchedulePresets();
	});
	const customMin = $derived.by(() => {
		void scheduleOpen;
		return customSendTimeMin();
	});
	const sendAtDate = $derived(draft.sendAt ? new Date(draft.sendAt) : null);
	const scheduleLabel = $derived(sendAtDate ? formatScheduleTime(sendAtDate) : 'Schedule');
	/** Overlays portal to <body>, so stack them just above their own panel. */
	const overlayZ = $derived(draft.z + 1);

	function pickSendAt(date: Date) {
		if (!isSendAtValid(date)) {
			compose.pushToast({ text: 'Pick a time at least a minute from now', tone: 'error' });
			return;
		}
		compose.setSendAt(draft.id, date.toISOString());
		scheduleOpen = false;
	}

	function pickCustomSendAt() {
		if (!customSendTime) return;
		pickSendAt(new Date(customSendTime));
	}

	/** Autosave state in the tabbed-studio's "Draft: …" vocabulary. */
	const saveLabel = $derived(
		draft.draftSaving
			? 'Saving…'
			: draft.draftSavedAt
				? `Saved ${new Date(draft.draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
				: null
	);

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
		if (event.button !== 0 || sheet) return;
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
		if (event.button !== 0 || sheet || draft.stage !== 'default') return;
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

</script>

<!-- Step markers, in the shell's status-dot vocabulary: the same ringed blue
     dot that marks a draft with content in the dock. -->
{#snippet stepDot(done: boolean)}
	<span
		class="size-1.5 shrink-0 rounded-full {done ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-slate-300'}"
		aria-hidden="true"
	></span>
{/snippet}

{#snippet sendButton(compact: boolean)}
	<button
		type="button"
		class="btn-tactile font-semibold {compact ? '!h-8 !px-3 !text-[12px]' : '!h-[30px] !px-4'} {draft
			.to.length === 0
			? '!border-slate-200 !bg-slate-100 !text-slate-400'
			: '!border-blue-700 !bg-blue-600 !text-white hover:!bg-blue-700'}"
		disabled={draft.sending}
		onclick={() => void compose.sendDraft(draft.id)}
	>
		{draft.sendAt ? 'Schedule send' : draft.sending ? 'Sending…' : 'Send'}
	</button>
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	bind:this={panelEl}
	role="dialog"
	tabindex="-1"
	aria-label="Compose: {title}"
	class="absolute flex flex-col overflow-hidden bg-white {sheet
		? 'inset-0'
		: 'rounded-[10px] border border-[#cbd5e1] shadow-2xl'} {draft.gesture
		? 'transition-none'
		: 'transition-[left,top,width,height] duration-[180ms]'}"
	style:left={sheet ? undefined : `${rect.x}px`}
	style:top={sheet ? undefined : `${rect.y}px`}
	style:width={sheet ? undefined : `${rect.w}px`}
	style:height={sheet ? undefined : `${height}px`}
	style:z-index="{draft.z}"
	onpointerdown={() => compose.raise(draft.id)}
>
	<!-- Header / drag handle -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={headerEl}
		class="flex h-[44px] shrink-0 touch-none items-center gap-2.5 border-b border-[#e2e8f0] bg-slate-50/90 px-3.5 select-none {sheet
			? ''
			: 'cursor-grab active:cursor-grabbing'}"
		onpointerdown={startDrag}
		onpointermove={moveDrag}
		onpointerup={endDrag}
		onpointercancel={endDrag}
		ondblclick={() => compose.toggleMaximize(draft.id)}
	>
		<span class="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">{title}</span>
		{#if saveLabel}
			<span class="shrink-0 text-[11px] tabular-nums text-slate-400">{saveLabel}</span>
		{/if}

		<div class="flex items-center gap-1">
			{#if sheet}
				{@render sendButton(true)}
			{/if}
			<button
				type="button"
				class="flex size-6 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors max-md:size-8"
				aria-label="Minimize"
				onpointerdown={(event) => event.stopPropagation()}
				onclick={() => compose.minimize(draft.id)}
			>
				<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
			</button>
			{#if !sheet && maximized}
				<button
					type="button"
					class="flex size-6 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
					aria-label="Restore down"
					onpointerdown={(event) => event.stopPropagation()}
					onclick={() => compose.toggleMaximize(draft.id)}
				>
					<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<rect x="3.5" y="6" width="6.5" height="6.5" rx="1" stroke="currentColor" stroke-width="1.4" />
						<path d="M6.5 3.5h6v6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
					</svg>
				</button>
			{:else if !sheet}
				<!-- A sheet already fills the shell; there is nothing to maximize. -->
				<button
					type="button"
					class="flex size-6 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
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
				class="flex size-6 items-center justify-center rounded-[4px] text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors max-md:size-8"
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
		<div class="flex min-h-[28px] flex-wrap items-start gap-x-3 gap-y-[6px] py-2">
			<span class="flex w-[62px] shrink-0 items-center gap-1.5 pt-1 pl-2">
				{@render stepDot(step > 0)}
				<span class="text-[13px] {step === 0 ? 'font-medium text-slate-900' : 'text-slate-500'}">To</span>
			</span>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="relative flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-[6px]"
				onclick={() => toInputEl?.focus()}
			>
				{#each draft.to as person (person.email)}
					{@const theme = getHobdayTheme(person.email || person.name)}
					{@const revealEmail =
						person.name.trim().length > 0 && person.name.trim() !== person.email.trim()}
					<!--
						The person's colour, at full strength: fill, stroke and text all
						from their Hobday theme. It used to be a white chip carrying an
						18px avatar tile — but a chip that already spells the name out
						does not need initials too, and the tile confined the colour to
						a corner. Now a row of recipients reads like the list does.
						Hovering the name still reveals the address in an Ark tooltip.
					-->
					<Tooltip disabled={!revealEmail} zIndex={overlayZ}>
						{#snippet trigger({ props })}
							<span
								{...props}
								class="flex h-[26px] items-center gap-1 rounded-[6px] border pr-0.5 pl-2 text-[13px] font-medium shadow-2xs"
								style:background-color={theme.bg}
								style:border-color={theme.border}
								style:color={theme.text}
							>
								<span class="max-w-[160px] truncate">{person.name || person.email}</span>
								<button
									type="button"
									class="flex size-[18px] items-center justify-center rounded-[4px] transition-colors hover:bg-black/10"
									aria-label="Remove {person.name || person.email}"
									onpointerdown={(event) => event.stopPropagation()}
									onclick={(event) => removeTo(event, person.email)}
								>
									<svg class="size-2.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
										<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
									</svg>
								</button>
							</span>
						{/snippet}
						<div class="flex min-w-0 items-center gap-2">
							<span
								class="flex size-[22px] shrink-0 items-center justify-center rounded-[5px] text-[10px] font-bold"
								style:background-color={theme.bg}
								style:border="1px solid {theme.border}"
								style:color={theme.text}
								aria-hidden="true"
							>
								{initials(person.name, person.email)}
							</span>
							<span class="min-w-0">
								<span class="block truncate text-[13px] font-semibold text-slate-800"
									>{person.name}</span
								>
								<span class="block truncate text-xs text-slate-500">{person.email}</span>
							</span>
						</div>
					</Tooltip>
				{/each}
				<input
					bind:this={toInputEl}
					id={toId}
					type="text"
					value={draft.toInput}
					oninput={onToInput}
					onkeydown={onToKeydown}
					onblur={() => compose.commitPendingTo(draft.id)}
					role="combobox"
					aria-expanded={draft.toOpen}
					aria-autocomplete="list"
					aria-controls={listboxId}
					placeholder={draft.to.length > 0 ? 'Add another' : 'Name or email address'}
					class="h-[26px] min-w-[120px] flex-1 basis-[120px] border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none max-md:text-base"
				/>
				{#if !draft.ccOpen}
					<button
						type="button"
						class="btn-tactile !h-[22px] !px-2 !text-[11px]"
						onclick={() => compose.patch(draft.id, { ccOpen: true })}
					>
						Cc
					</button>
				{/if}
				{#if !draft.bccOpen}
					<button
						type="button"
						class="btn-tactile !h-[22px] !px-2 !text-[11px]"
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
						class="absolute top-[calc(100%+4px)] right-[52px] left-[66px] z-5 max-h-[214px] overflow-y-auto rounded-[8px] border border-[#cbd5e1] bg-white p-1.5 shadow-lg max-md:right-0 max-md:left-0"
					>
						{#each suggestions as suggestion, index (suggestion.email)}
							{@const theme = getHobdayTheme(suggestion.email || suggestion.name)}
							<button
								type="button"
								role="option"
								aria-selected={index === draft.toHi}
								class="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-left transition-colors {index ===
								draft.toHi
									? 'bg-slate-100'
									: ''}"
								onpointerdown={(event) => event.preventDefault()}
								onclick={() => {
									compose.commitTo(draft.id, draft.toInput, suggestion);
									refocusAfterCommit();
								}}
							>
								<span
									class="flex size-[26px] shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold"
									style:background-color={theme.bg}
									style:border="1px solid {theme.border}"
									style:color={theme.text}
								>
									{initials(suggestion.name, suggestion.email)}
								</span>
								<span class="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800">
									{suggestion.name || suggestion.email}
								</span>
								<span class="min-w-0 truncate text-xs text-slate-500">{suggestion.email}</span>
								{#if suggestion.meta}
									<span class="shrink-0 text-[11px] text-slate-400">{suggestion.meta}</span>
								{/if}
								{#if index === draft.toHi}
									<kbd
										class="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] border border-[#cbd5e1] bg-slate-50 px-1 font-mono text-[11px] text-slate-500 shadow-2xs"
										aria-hidden="true">↵</kbd
									>
								{/if}
							</button>
						{/each}
						{#if suggestions.length === 0}
							<p class="px-2.5 py-1.5 text-[13px] text-slate-500">
								{#if draft.toInput.includes('@')}
									Press
									<kbd
										class="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-[#cbd5e1] bg-slate-50 px-1 font-mono text-[11px] text-slate-500 shadow-2xs"
										>Enter</kbd
									>
									to add {draft.toInput.trim()}
								{:else}
									No matching contacts
								{/if}
							</p>
						{:else}
							<div
								class="mt-1 flex items-center justify-end gap-3 border-t border-[#e2e8f0] px-2 pt-1.5 text-[11px] text-slate-400"
							>
								<span class="flex items-center gap-1">
									<kbd
										class="flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-slate-200 bg-slate-50 px-1 font-mono text-[10px]"
										aria-hidden="true">↑↓</kbd
									>
									navigate
								</span>
								<span class="flex items-center gap-1">
									<kbd
										class="flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-slate-200 bg-slate-50 px-1 font-mono text-[10px]"
										aria-hidden="true">↵</kbd
									>
									add
								</span>
								<span class="flex items-center gap-1">
									<kbd
										class="flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-slate-200 bg-slate-50 px-1 font-mono text-[10px]"
										aria-hidden="true">esc</kbd
									>
									dismiss
								</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		{#if draft.ccOpen}
			<div class="flex h-[45px] items-center gap-3 border-b border-[#e2e8f0]">
				<span class="w-[62px] shrink-0 pl-5 text-[13px] text-slate-500">Cc</span>
				<input
					type="text"
					value={draft.cc}
					oninput={(event) =>
						compose.patch(draft.id, { cc: (event.currentTarget as HTMLInputElement).value })}
					placeholder="Copy someone in"
					class="h-7 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none max-md:text-base"
				/>
				<button
					type="button"
					class="flex size-[22px] shrink-0 items-center justify-center rounded-[4px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
			<div class="flex h-[45px] items-center gap-3 border-b border-[#e2e8f0]">
				<span class="w-[62px] shrink-0 pl-5 text-[13px] text-slate-500">Bcc</span>
				<input
					type="text"
					value={draft.bcc}
					oninput={(event) =>
						compose.patch(draft.id, { bcc: (event.currentTarget as HTMLInputElement).value })}
					placeholder="Hidden recipients"
					class="h-7 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none max-md:text-base"
				/>
				<button
					type="button"
					class="flex size-[22px] shrink-0 items-center justify-center rounded-[4px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
		<div class="flex h-[45px] items-center gap-3 border-b border-[#e2e8f0] {subjectDim} transition-opacity duration-[160ms]">
			<span class="flex w-[62px] shrink-0 items-center gap-1.5 pl-2">
				{@render stepDot(step === 2)}
				<span class="text-[13px] {step === 1 ? 'font-medium text-slate-900' : 'text-slate-500'}">Subject</span>
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
				class="h-7 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 focus:outline-none max-md:text-base"
			/>
		</div>

		<!-- Message -->
		<!-- Maximized: the message box flexes to fill the pane instead of a fixed step. -->
		<textarea
			id={bodyId}
			value={draft.body}
			oninput={onBodyInput}
			onfocus={() => compose.patch(draft.id, { bodyOpened: true })}
			class="w-full resize-none border-0 bg-transparent pt-[14px] pb-4 text-[15px] leading-[1.7] text-slate-800 focus:outline-none max-md:text-base {bodyOpen
				? 'opacity-100'
				: 'opacity-68'} {filled ? 'min-h-0 flex-1 max-w-[46em]' : 'max-w-[33em]'}"
			style:height={filled ? undefined : `${bodyHeight}px`}
			style:transition="height 200ms ease"
			aria-label="Message"
		></textarea>

		{#if draft.sendError}
			<p class="pb-2 text-xs font-medium text-red-600">{draft.sendError}</p>
		{/if}
	</div>

	<!-- Attachment strip -->
	{#if draft.attachments.length > 0}
		<div class="flex max-h-[66px] shrink-0 flex-wrap content-start gap-2 overflow-y-auto pt-3 pb-3 pr-4 pl-4">
			{#each draft.attachments as attachment (attachment.id)}
				{@const badge = attachmentBadge(attachment.type)}
				<span class="flex h-[30px] shrink-0 items-center gap-2 rounded-[6px] border border-[#cbd5e1] bg-white pr-1 pl-1.5 shadow-2xs">
					<span
						class="flex h-5 min-w-5 items-center justify-center rounded-[4px] px-1 text-[10px] font-bold uppercase"
						style:background-color={badge.bg}
						style:border="1px solid {badge.border}"
						style:color={badge.text}
					>
						{attachmentKind(attachment.name, attachment.type)}
					</span>
					<span
						class="max-w-[180px] truncate text-[13px] font-medium {attachment.status === 'error'
							? 'text-red-600'
							: 'text-slate-800'}"
					>
						{attachment.name}
					</span>
					<span class="shrink-0 text-xs font-medium text-slate-400 tabular-nums">
						{attachment.status === 'uploading'
							? '…'
							: attachment.status === 'error'
								? 'Failed'
								: formatAttachmentSize(attachment.size)}
					</span>
					<button
						type="button"
						class="flex size-[18px] shrink-0 items-center justify-center rounded-[4px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
	<div class="flex h-[53px] shrink-0 items-center gap-2 border-t border-[#e2e8f0] pr-3 pl-4">
		<button
			type="button"
			class="btn-tactile !size-[30px] !p-0"
			aria-label="Attach a file"
			title="Attach a file"
			onclick={() => fileInputEl?.click()}
		>
			<svg class="size-[18px] text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
		<Popover.Root
					open={scheduleOpen}
					onOpenChange={(details) => (scheduleOpen = details.open)}
					positioning={{ placement: 'bottom-end', gutter: 8 }}
					lazyMount
					unmountOnExit
				>
					<Popover.Trigger
						class="btn-tactile !h-[30px] !px-2.5 !text-[12px] {draft.sendAt
							? '!border-blue-400 !bg-blue-50 !text-blue-700'
							: ''}"
						aria-label="Schedule send"
						title="Schedule send"
					>
						<svg class="size-[18px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.4" />
							<path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
						</svg>
						{scheduleLabel}
					</Popover.Trigger>
					<Portal>
						<Popover.Positioner style={`z-index: ${overlayZ}`}>
							<Popover.Content
								class="w-64 rounded-[8px] border border-[#cbd5e1] bg-white p-1.5 shadow-lg outline-none"
								aria-label="Schedule send"
							>
								{#if draft.sendAt}
									<button
										type="button"
										class="flex w-full items-center justify-between gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
										onclick={() => {
											compose.setSendAt(draft.id, null);
											scheduleOpen = false;
										}}
									>
										<span>Send immediately</span>
										<span class="text-xs text-slate-400">clear</span>
									</button>
									<div class="my-1.5 border-t border-[#e2e8f0]"></div>
								{/if}
								{#each schedulePresets as preset (preset.label)}
									<button
										type="button"
										class="flex w-full items-center justify-between gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
										onclick={() => pickSendAt(preset.date)}
									>
										<span>{preset.label}</span>
										<span class="text-xs tabular-nums text-slate-500">
											{formatScheduleTime(preset.date)}
										</span>
									</button>
								{/each}
								<div class="my-1.5 border-t border-[#e2e8f0]"></div>
								<div class="flex flex-col gap-1.5 px-1.5 pt-1 pb-1">
									<label class="text-xs text-slate-500" for="compose-schedule-{draft.id}">
										Pick date &amp; time
									</label>
									<input
										id="compose-schedule-{draft.id}"
										type="datetime-local"
										class="h-9 rounded-[6px] border border-[#cbd5e1] bg-white px-2.5 text-[13px] text-slate-800 shadow-2xs outline-none focus:border-blue-500"
										min={customMin}
										value={customSendTime}
										oninput={(event) =>
											(customSendTime = (event.currentTarget as HTMLInputElement).value)}
									/>
									<button
										type="button"
										class="btn-tactile !h-[30px] !text-[12px] font-semibold"
										disabled={!customSendTime}
										onclick={pickCustomSendAt}
									>
										Schedule
									</button>
								</div>
							</Popover.Content>
						</Popover.Positioner>
					</Portal>
				</Popover.Root>
		<button
			type="button"
			class="ml-auto btn-tactile !size-[30px] !p-0 !text-red-600 hover:!border-red-300 hover:!bg-red-50"
			aria-label="Discard draft"
			title="Discard draft"
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
			<!-- Primary last, on the right: attach/schedule left, discard + Send right. -->
			{#if !sheet}
				{@render sendButton(false)}
			{/if}
		</div>

	{#if !filled}
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
				<path d="M6.5 0.5L0.5 6.5M6.5 4L4 6.5" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" />
			</svg>
		</div>
	{/if}
</div>
