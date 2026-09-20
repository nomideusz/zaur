<script lang="ts">
	import { attachmentKind, formatAttachmentSize } from '#lib/compose/attachments';
	import { EDGE, PANEL_MIN_H, bodyHeightPx, clamp, clampPanel, computeAutoHeight, computeStep, maximizedRect } from '#lib/compose/layout';
	import { filterContacts } from '#lib/compose/recipients';
	import { compose } from '#lib/compose/store.svelte.ts';
	import { initials } from '#lib/mail/rows';
	import RichBody from './RichBody.svelte';
	import RichToolbar from './RichToolbar.svelte';
	import ActionIcon from '#lib/components/mail/ActionIcon.svelte';
	import { attachmentBadge, identityTone } from '#lib/mail/colors';
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
	import type { Draft, Recipient, RecipientField } from '#lib/compose/types';

	interface Props {
		draft: Draft;
		rootW: number;
		rootH: number;
	}

	let { draft, rootW, rootH }: Props = $props();

	let panelEl = $state<HTMLDivElement | null>(null);
	let headerEl = $state<HTMLElement | null>(null);
	let fileInputEl = $state<HTMLInputElement | null>(null);

	const fieldId = (field: RecipientField) => `compose-${field}-${draft.id}`;
	const listboxId = (field: RecipientField) => `compose-suggestions-${field}-${draft.id}`;
	const subjectId = $derived(`compose-subject-${draft.id}`);
	const bodyId = $derived(`compose-body-${draft.id}`);
	const toolsId = $derived(`compose-tools-${draft.id}`);

	/**
	 * The per-field key names. To, Cc and Bcc are one field three times over, so
	 * everything below reads the one it is drawing rather than existing thrice.
	 */
	const INPUT = { to: 'toInput', cc: 'ccInput', bcc: 'bccInput' } as const;
	const OPEN = { to: 'toOpen', cc: 'ccOpen', bcc: 'bccOpen' } as const;
	const HI = { to: 'toHi', cc: 'ccHi', bcc: 'bccHi' } as const;

	const inputOf = (field: RecipientField) => draft[INPUT[field]];
	const openOf = (field: RecipientField) => draft[OPEN[field]];
	const hiOf = (field: RecipientField) => draft[HI[field]];
	/** Nobody already on the draft is worth suggesting again, whichever row they are on. */
	const suggestionsFor = (field: RecipientField) =>
		filterContacts(compose.contacts, inputOf(field), [...draft.to, ...draft.cc, ...draft.bcc]);
	const focusField = (field: RecipientField) => document.getElementById(fieldId(field))?.focus();

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
	// An auto height never runs off a short shell: the field column scrolls instead.
	const height = $derived(
		maximized || !draft.auto
			? rect.h
			: Math.max(PANEL_MIN_H, Math.min(computeAutoHeight(draft), rootH - draft.y - EDGE))
	);
	const step = $derived(computeStep(draft));
	const bodyHeight = $derived(bodyHeightPx(draft));
	// Full-strength once the box has grown — an equality check dimmed it at 340 (maximized).
	const bodyOpen = $derived(bodyHeight >= 340);
	const title = $derived(draft.subject.trim() || 'New message');
	/** What a sheet's bar says, where the subject already has a field of its own. */
	const sheetTitle = $derived(
		{
			new: 'New message',
			reply: 'Reply',
			replyAll: 'Reply all',
			forward: 'Forward',
			draft: 'Draft'
		}[draft.kind]
	);
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
		const id = target === 'to' ? fieldId('to') : target === 'subject' ? subjectId : bodyId;
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

	// --- address fields ---

	function onRecipientInput(event: Event, field: RecipientField) {
		compose.setRecipientInput(draft.id, field, (event.currentTarget as HTMLInputElement).value);
	}

	function onRecipientKeydown(event: KeyboardEvent, field: RecipientField) {
		const items = suggestionsFor(field);
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!openOf(field)) {
				compose.setRecipientOpen(draft.id, field, true);
				return;
			}
			const count = Math.max(items.length, 1);
			const delta = event.key === 'ArrowDown' ? 1 : -1;
			compose.setRecipientHighlight(draft.id, field, (hiOf(field) + delta + count) % count);
			return;
		}
		if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
			const highlighted = items[hiOf(field)] ?? null;
			const text = inputOf(field);
			if (!highlighted && !/@/.test(text)) {
				if (event.key === ',') event.preventDefault();
				return;
			}
			event.preventDefault();
			compose.addRecipient(draft.id, field, text, highlighted);
			refocusAfterCommit(field);
			return;
		}
		if (event.key === 'Escape') {
			if (openOf(field)) {
				// Closes the suggestion list only — must not minimize the panel.
				event.preventDefault();
				event.stopPropagation();
				compose.setRecipientOpen(draft.id, field, false);
			}
			return;
		}
		if (event.key === 'Backspace') {
			compose.backspaceRemoveRecipient(draft.id, field);
		}
	}

	// Picking a recipient must move focus after the input's own focus
	// restore, hence the double rAF plus a fresh DOM query (spec).
	function refocusAfterCommit(field: RecipientField) {
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				// From To, a draft with no subject yet moves on to one; Cc and Bcc
				// always stay put, since you are usually adding more than one.
				const id = field !== 'to' || draft.subject.trim() ? fieldId(field) : subjectId;
				document.getElementById(id)?.focus();
			})
		);
	}

	// --- editing a chip ---

	/**
	 * A chip hands its text back rather than only offering to be deleted: one
	 * wrong letter in the fourth of four addresses used to mean retyping it.
	 */
	let editing = $state<{ field: RecipientField; email: string } | null>(null);
	let editText = $state('');

	function startEdit(event: MouseEvent, field: RecipientField, person: Recipient) {
		event.stopPropagation();
		editing = { field, email: person.email };
		// `Name <address>` round-trips through `makeRecipient`, so correcting the
		// address keeps the name that came with it.
		editText = person.name.trim() ? `${person.name} <${person.email}>` : person.email;
	}

	function commitEdit() {
		if (!editing) return;
		const { field, email } = editing;
		editing = null;
		compose.editRecipient(draft.id, field, email, editText);
	}

	function onEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === 'Tab') {
			const field = editing?.field;
			event.preventDefault();
			commitEdit();
			if (field) focusField(field);
		} else if (event.key === 'Escape') {
			// Abandons the edit only — must not minimize the panel.
			event.preventDefault();
			event.stopPropagation();
			editing = null;
		}
	}

	/** An edit starts with the whole address selected: most of them are replacements. */
	function takeEdit(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function onSubjectKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			compose.patch(draft.id, { bodyOpened: true });
			document.getElementById(bodyId)?.focus();
		}
	}

	function removeChip(event: MouseEvent, field: RecipientField, email: string) {
		event.stopPropagation();
		compose.removeRecipient(draft.id, field, email);
	}

</script>

<!-- Step markers, in the shell's status-dot vocabulary: the same ringed blue
     dot that marks a draft with content in the dock. -->
{#snippet stepDot(done: boolean)}
	<span
		class="size-[7px] shrink-0 rounded-full border {done ? 'border-[var(--z-accent-stroke)] bg-[var(--z-accent)]' : 'border-[var(--z-line)] bg-[var(--z-line)]'}"
		aria-hidden="true"
	></span>
{/snippet}

<!-- Primary, and recessed until there is a recipient; the key sits inside it on a desk. -->
{#snippet sendButton(compact: boolean)}
	<button
		type="button"
		class="btn-tactile btn-primary {compact ? '!h-11 !px-4 !text-[14px] !font-semibold' : '!h-[30px] !px-3.5'}"
		disabled={draft.sending || draft.to.length === 0}
		onclick={() => void compose.sendDraft(draft.id)}
	>
		{draft.sendAt ? 'Schedule send' : draft.sending ? 'Sending…' : 'Send'}
		{#if !compact}
			<kbd class="z-kbd z-kbd-inverse !h-[18px]" aria-hidden="true">⌘↵</kbd>
		{/if}
	</button>
{/snippet}


<!--
	One address row, for whichever of the three it is drawing. `label` is the
	placeholder it shows while empty — see the note where these are rendered.
-->
{#snippet addressRow(field: RecipientField, label: string)}
	{@const list = draft[field]}
	{@const items = suggestionsFor(field)}
	<div class="flex min-h-[28px] items-start gap-2.5 border-b border-[var(--z-hairline)] py-2 max-md:min-h-8 max-md:py-2.5">
		<span class="flex h-[26px] shrink-0 items-center max-md:h-8">{@render stepDot(list.length > 0)}</span>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="relative flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-[6px]"
			onclick={() => focusField(field)}
		>
			{#each list as person (person.email)}
				{@const theme = identityTone(person.email || person.name)}
				{#if editing?.field === field && editing.email === person.email}
					<!-- The chip, opened. It keeps the chip's shape so the row does not
					     jump, and grows with what is typed into it. -->
					<input
						use:takeEdit
						bind:value={editText}
						onkeydown={onEditKeydown}
						onblur={commitEdit}
						size={Math.max(editText.length + 1, 12)}
						aria-label="Edit {person.name || person.email}"
						class="h-[26px] max-w-full min-w-0 rounded-[6px] border px-2 text-[13px] font-medium shadow-[var(--z-shadow-tactile)] focus:outline-none max-md:text-base"
						style:background-color={theme.fill}
						style:border-color={theme.stroke}
						style:color={theme.ink}
					/>
				{:else}
					{@const revealEmail =
						person.name.trim().length > 0 && person.name.trim() !== person.email.trim()}
					<!--
						The person's colour, at full strength: fill, stroke and text all
						from their Hobday theme. It used to be a white chip carrying an
						18px avatar tile — but a chip that already spells the name out
						does not need initials too, and the tile confined the colour to
						a corner. Now a row of recipients reads like the list does.
						Hovering the name still reveals the address in an Ark tooltip;
						clicking it opens the chip for editing.
					-->
					<Tooltip disabled={!revealEmail} zIndex={overlayZ}>
						{#snippet trigger({ props })}
							<span
								{...props}
								class="flex h-[26px] items-center gap-1 rounded-[6px] border px-0.5 text-[13px] font-medium shadow-[var(--z-shadow-tactile)]"
								style:background-color={theme.fill}
								style:border-color={theme.stroke}
								style:color={theme.ink}
							>
								<button
									type="button"
									class="max-w-[160px] truncate rounded-[4px] px-1.5 transition-colors hover:bg-black/10"
									title="Edit {person.email}"
									onpointerdown={(event) => event.stopPropagation()}
									onclick={(event) => startEdit(event, field, person)}
								>
									{person.name || person.email}
								</button>
								<button
									type="button"
									class="flex size-[18px] shrink-0 items-center justify-center rounded-[4px] transition-colors hover:bg-black/10"
									aria-label="Remove {person.name || person.email}"
									onpointerdown={(event) => event.stopPropagation()}
									onclick={(event) => removeChip(event, field, person.email)}
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
								style:background-color={theme.fill}
								style:border="1px solid {theme.stroke}"
								style:color={theme.ink}
								aria-hidden="true"
							>
								{initials(person.name, person.email)}
							</span>
							<span class="min-w-0">
								<span class="block truncate text-[13px] font-semibold text-[var(--z-body)]">{person.name}</span>
								<span class="block truncate text-xs text-[var(--z-soft)]">{person.email}</span>
							</span>
						</div>
					</Tooltip>
				{/if}
			{/each}
			<input
				id={fieldId(field)}
				type="text"
				value={inputOf(field)}
				oninput={(event) => onRecipientInput(event, field)}
				onkeydown={(event) => onRecipientKeydown(event, field)}
				onblur={() => compose.commitPendingRecipient(draft.id, field)}
				role="combobox"
				aria-expanded={openOf(field)}
				aria-autocomplete="list"
				aria-controls={listboxId(field)}
				aria-label={label}
				placeholder={list.length > 0 ? '' : label}
				class="h-[26px] min-w-[120px] flex-1 basis-[120px] border-0 bg-transparent text-sm text-[var(--z-ink)] placeholder:text-[var(--z-faint)] focus:outline-none max-md:text-base"
			/>

			{#if openOf(field)}
				<div
					id={listboxId(field)}
					role="listbox"
					aria-label="Contact suggestions"
					class="absolute top-[calc(100%+4px)] right-0 left-0 z-5 max-h-[214px] overflow-y-auto rounded-[10px] border border-[var(--z-line)] bg-[var(--z-surface)] p-1.5 shadow-[var(--z-shadow-menu)]"
				>
					{#each items as suggestion, index (suggestion.email)}
						{@const theme = identityTone(suggestion.email || suggestion.name)}
						<button
							type="button"
							role="option"
							aria-selected={index === hiOf(field)}
							class="flex w-full items-center gap-2.5 rounded-[8px] border px-[9px] py-1.5 text-left transition-colors {index ===
							hiOf(field)
								? 'border-[var(--z-accent-stroke)] bg-[var(--z-accent-soft)]' : 'border-transparent'}"
							onpointerdown={(event) => event.preventDefault()}
							onclick={() => {
								compose.addRecipient(draft.id, field, inputOf(field), suggestion);
								refocusAfterCommit(field);
							}}
						>
							<span
								class="flex size-[26px] shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold"
								style:background-color={theme.fill}
								style:border="1px solid {theme.stroke}"
								style:color={theme.ink}
							>
								{initials(suggestion.name, suggestion.email)}
							</span>
							<span class="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--z-body)]">
								{suggestion.name || suggestion.email}
							</span>
							<span class="min-w-0 truncate text-xs text-[var(--z-soft)] max-md:hidden">{suggestion.email}</span>
							{#if suggestion.meta}
								<span class="shrink-0 text-[11px] text-[var(--z-faint)] max-md:hidden">{suggestion.meta}</span>
							{/if}
							{#if index === hiOf(field)}
								<kbd class="z-kbd" aria-hidden="true">↵</kbd>
							{/if}
						</button>
					{/each}
					{#if items.length === 0}
						<p class="px-2.5 py-1.5 text-[13px] text-[var(--z-soft)]">
							{#if inputOf(field).includes('@')}
								Press <kbd class="z-kbd mx-0.5">Enter</kbd> to add {inputOf(field).trim()}
							{:else}
								No matching contacts
							{/if}
						</p>
					{:else}
						<div
							class="mt-1 flex items-center justify-end gap-3 border-t border-[var(--z-hairline)] px-2 pt-1.5 text-[11px] text-[var(--z-faint)] max-md:hidden"
						>
							<span class="flex items-center gap-1"><kbd class="z-kbd" aria-hidden="true">↑↓</kbd> navigate</span>
							<span class="flex items-center gap-1"><kbd class="z-kbd" aria-hidden="true">↵</kbd> add</span>
							<span class="flex items-center gap-1"><kbd class="z-kbd" aria-hidden="true">esc</kbd> dismiss</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if field === 'to'}
			<!--
				Cc and Bcc used to live inside the chip row, so the first recipient
				pushed them onto a line of their own. They hold the row's right edge
				now: the chips wrap under themselves and these stay where they were.

				A phone gets one chevron instead of two words, and it opens both.
				Two labelled buttons cost ~100px of a 390px screen — width the names
				need more, and each row carries its own ✕ for whichever you did not
				want.
			-->
			{#if !draft.ccShown || !draft.bccShown}
				<div class="flex h-[26px] shrink-0 items-center gap-1 max-md:h-8">
					<button
						type="button"
						class="btn-tactile !size-8 !rounded-[8px] !p-0 md:hidden"
						aria-label="Show Cc and Bcc"
						title="Cc and Bcc"
						onclick={() => {
							compose.showRecipientField(draft.id, 'cc', true);
							compose.showRecipientField(draft.id, 'bcc', true);
						}}
					>
						<svg class="size-4 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
					{#if !draft.ccShown}
						<button
							type="button"
							class="btn-tactile !h-[22px] !rounded-[6px] !px-2 !text-[11px] max-md:hidden"
							onclick={() => compose.showRecipientField(draft.id, 'cc', true)}
						>
							Cc
						</button>
					{/if}
					{#if !draft.bccShown}
						<button
							type="button"
							class="btn-tactile !h-[22px] !rounded-[6px] !px-2 !text-[11px] max-md:hidden"
							onclick={() => compose.showRecipientField(draft.id, 'bcc', true)}
						>
							Bcc
						</button>
					{/if}
				</div>
			{/if}
		{:else}
			<span class="flex h-[26px] shrink-0 items-center max-md:h-8">
				<button
					type="button"
					class="flex size-[22px] items-center justify-center rounded-[4px] text-[var(--z-faint)] transition-colors hover:bg-[var(--z-sunken)] hover:text-[var(--z-ink)] max-md:size-8 max-md:rounded-[8px]"
					aria-label="Remove {label}"
					onclick={() => compose.showRecipientField(draft.id, field as 'cc' | 'bcc', false)}
				>
					<svg class="size-3 max-md:size-[15px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					</svg>
				</button>
			</span>
		{/if}
	</div>
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	bind:this={panelEl}
	role="dialog"
	tabindex="-1"
	aria-label="Compose: {title}"
	class="absolute flex flex-col overflow-hidden bg-[var(--z-surface)] {sheet
		? 'inset-0'
		: 'rounded-[12px] border border-[var(--z-line)] shadow-[0_24px_56px_rgba(11,18,32,0.26)]'} {draft.gesture
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
		class="flex shrink-0 touch-none items-center border-b border-[var(--z-hairline)] select-none {sheet
			? 'h-[60px] gap-2 bg-[var(--z-surface)] px-2.5'
			: 'h-[44px] cursor-grab gap-2.5 bg-[var(--z-hover)] pr-2.5 pl-3.5 active:cursor-grabbing'}"
		onpointerdown={startDrag}
		onpointermove={moveDrag}
		onpointerup={endDrag}
		onpointercancel={endDrag}
		ondblclick={() => compose.toggleMaximize(draft.id)}
	>
		{#if sheet}
			<!--
				A sheet is one screen, so it gets the reader's rule: the way out alone
				at the left edge, Send at the right where the thumb is, and targets
				sized for a thumb in between. The bar says what kind of message this is
				rather than repeating a truncated subject — that is a field two rows
				down, and the only thing the window header has to tell panels apart.
			-->
			<button
				type="button"
				class="btn-tactile !size-11 !p-0"
				aria-label="Close draft"
				onpointerdown={(event) => event.stopPropagation()}
				onclick={() => compose.close(draft.id)}
			>
				<svg class="size-[17px] text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
			</button>
			<span class="min-w-0 flex-1 truncate pl-1 text-[15px] font-bold text-[var(--z-ink)]">{sheetTitle}</span>
			{#if saveLabel}
				<span class="z-mono shrink-0 text-[11px] text-[var(--z-soft)]">{saveLabel}</span>
			{/if}
			<button
				type="button"
				class="btn-tactile !size-11 !p-0"
				aria-label="Minimize"
				onpointerdown={(event) => event.stopPropagation()}
				onclick={() => compose.minimize(draft.id)}
			>
				<svg class="size-[17px] text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
			</button>
			{@render sendButton(true)}
		{:else}
			<span class="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--z-body)]">{title}</span>
			{#if saveLabel}
				<span class="z-mono shrink-0 text-[10.5px] text-[var(--z-soft)]">{saveLabel}</span>
			{/if}

			<div class="flex items-center gap-1">
				<button
					type="button"
					class="z-icon-btn hover:!bg-[var(--z-hairline)]"
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
						class="z-icon-btn hover:!bg-[var(--z-hairline)]"
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
						class="z-icon-btn hover:!bg-[var(--z-hairline)]"
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
					class="z-icon-btn hover:!bg-[var(--z-ch-discard-hover)] hover:!text-[var(--z-ch-discard-solid)]"
					aria-label="Close draft"
					onpointerdown={(event) => event.stopPropagation()}
					onclick={() => compose.close(draft.id)}
				>
					<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
				</button>
			</div>
		{/if}
	</div>

	<!-- Fields -->
	<div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
		<!--
			To, Cc and Bcc are one row drawn three times. Each is a chip list with
			completion over the same address book, so a wrong address in Cc is
			caught where a wrong address in To always was — the two used to be bare
			comma-separated inputs that were only parsed at send.

			The field's name is its placeholder, not a label in a 72px gutter: a
			row with chips in it says what it is, and on a phone that gutter was a
			fifth of the screen spent saying "To".
		-->
		{@render addressRow('to', 'To')}
		{#if draft.ccShown}{@render addressRow('cc', 'Cc')}{/if}
		{#if draft.bccShown}{@render addressRow('bcc', 'Bcc')}{/if}

		<!-- Subject -->
		<div class="flex h-[45px] items-center gap-2.5 border-b border-[var(--z-hairline)] max-md:h-[54px] {subjectDim} transition-opacity duration-[160ms]">
			{@render stepDot(step === 2)}
			<input
				id={subjectId}
				type="text"
				value={draft.subject}
				placeholder="Subject"
				oninput={(event) =>
					compose.patch(draft.id, {
						subject: (event.currentTarget as HTMLInputElement).value,
						sendError: null
					})}
				onkeydown={onSubjectKeydown}
				class="h-7 min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--z-ink)] placeholder:text-[var(--z-faint)] focus:outline-none max-md:text-base"
			/>
		</div>

		<!-- Message -->
		<!-- Maximized: the message box flexes to fill the pane instead of a fixed step. -->
		{#if draft.plain}
			<textarea
				id={bodyId}
				value={draft.body}
				oninput={(event) =>
					compose.patch(draft.id, { body: event.currentTarget.value, bodyOpened: true, sendError: null })}
				onfocus={() => compose.patch(draft.id, { bodyOpened: true })}
				class="z-mono -mr-4 resize-none border-0 bg-transparent pt-[14px] pr-4 pb-4 text-[14px] leading-[1.7] text-[var(--z-body)] focus:outline-none max-md:text-base {bodyOpen
					? 'opacity-100'
					: 'opacity-68'} {filled ? 'min-h-0 flex-1' : ''}"
				style:height={filled ? undefined : `${bodyHeight}px`}
				style:transition="height 200ms ease"
				style:scrollbar-width="thin"
				aria-label="Message"
			></textarea>
		{:else}
			<RichBody
				id={bodyId}
				toolbar={toolsId}
				html={draft.bodyHtml}
				text={draft.body}
				onchange={(body, bodyHtml) => compose.patch(draft.id, { body, bodyHtml, bodyOpened: true, sendError: null })}
				onfocus={() => compose.patch(draft.id, { bodyOpened: true })}
				onfiles={(files) => compose.attachFiles(draft.id, files)}
				class="-mr-4 pt-[14px] pr-4 pb-4 text-[15px] leading-[1.7] text-[var(--z-body)] max-md:text-base {bodyOpen
					? 'opacity-100'
					: 'opacity-68'} {filled ? 'min-h-0 flex-1 [&>*]:max-w-[46em]' : '[&>*]:max-w-[33em]'}"
				height={filled ? undefined : `${bodyHeight}px`}
			/>
		{/if}

		{#if draft.sendError}
			<p class="pb-2 text-xs font-medium text-red-600">{draft.sendError}</p>
		{/if}
	</div>

	<!-- Attachment strip -->
	{#if draft.attachments.length > 0}
		<div class="flex max-h-[66px] shrink-0 flex-wrap content-start gap-2 overflow-y-auto pt-3 pb-3 pr-4 pl-4">
			{#each draft.attachments as attachment (attachment.id)}
				{@const badge = attachmentBadge(attachment.type)}
				{@const failed = attachment.status === 'error'}
				<!--
					Uploading replaces the size with a progress rule; a failure turns the
					whole chip into the discard channel and offers the one action worth
					having, Retry — the file is kept until it lands.
				-->
				<span
					class="flex h-[30px] shrink-0 items-center gap-2 rounded-[8px] border pr-1.5 pl-1.5 {failed
						? 'border-[var(--z-ch-discard-stroke)] bg-[var(--z-ch-discard-fill)]'
						: 'border-[var(--z-line)] bg-[var(--z-surface)] shadow-[var(--z-shadow-tactile)]'}"
				>
					<span
						class="flex h-5 min-w-5 items-center justify-center rounded-[5px] border px-1 text-[9px] font-bold uppercase"
						style:background-color={failed ? 'var(--z-surface)' : badge.bg}
						style:border-color={failed ? 'var(--z-ch-discard-stroke)' : badge.border}
						style:color={failed ? 'var(--z-ch-discard-ink)' : badge.text}
					>
						{attachmentKind(attachment.name, attachment.type)}
					</span>
					<span class="max-w-[180px] truncate text-[13px] font-medium {failed ? 'text-[var(--z-ch-discard-ink)]' : 'text-[var(--z-body)]'}">
						{attachment.name}
					</span>
					{#if attachment.status === 'uploading'}
						<span class="z-upload-rule inline-flex h-[5px] w-7 overflow-hidden rounded-full bg-[var(--z-hairline)]" aria-label="Uploading" role="progressbar">
							<span class="block h-full w-3/5 bg-[var(--z-accent)]"></span>
						</span>
					{:else if failed}
						<span class="z-mono shrink-0 text-[10.5px] text-[var(--z-ch-discard-ink)]">Failed · {formatAttachmentSize(attachment.size)}</span>
						<button
							type="button"
							class="btn-tactile !h-[22px] !rounded-[6px] !border-[var(--z-ch-discard-line)] !px-2 !text-[11px] !font-semibold !text-[var(--z-ch-discard-ink)]"
							onclick={() => compose.retryAttachment(draft.id, attachment.id)}
						>
							Retry
						</button>
					{:else}
						<span class="z-mono shrink-0 text-[10.5px] text-[var(--z-soft)]">{formatAttachmentSize(attachment.size)}</span>
					{/if}
					<button
						type="button"
						class="z-icon-btn !size-[18px] !rounded-[5px] {failed ? 'hover:!bg-[color-mix(in_oklab,var(--z-surface)_70%,transparent)]' : ''}"
						aria-label="Remove {attachment.name}"
						onclick={() => compose.removeAttachment(draft.id, attachment.id)}
					>
						<svg class="size-2.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						</svg>
					</button>
				</span>
			{/each}
		</div>
	{/if}

	<!-- Action bar -->
	<div class="relative flex h-[53px] shrink-0 items-center gap-2 border-t border-[var(--z-hairline)] pr-3 pl-4">
		<button
			type="button"
			class="btn-tactile !size-[30px] !p-0"
			aria-label="Attach a file"
			title="Attach a file"
			onclick={() => fileInputEl?.click()}
		>
			<ActionIcon name="clip" class="size-[18px] text-[var(--z-strong)]" />
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
							? '!border-[var(--z-ch-needs-solid)] !bg-[var(--z-ch-needs-fill)] !text-[var(--z-ch-needs-ink)] !font-semibold'
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
								class="z-menu w-[260px] outline-none"
								aria-label="Schedule send"
							>
								{#if draft.sendAt}
									<button
										type="button"
										class="flex w-full items-center justify-between gap-2 z-menu-item justify-between"
										onclick={() => {
											compose.setSendAt(draft.id, null);
											scheduleOpen = false;
										}}
									>
										<span>Send immediately</span>
										<span class="text-xs text-[var(--z-faint)]">clear</span>
									</button>
									<div class="my-1.5 border-t border-[var(--z-hairline)]"></div>
								{/if}
								{#each schedulePresets as preset (preset.label)}
									<button
										type="button"
										class="flex w-full items-center justify-between gap-2 z-menu-item justify-between"
										onclick={() => pickSendAt(preset.date)}
									>
										<span>{preset.label}</span>
										<span class="text-xs tabular-nums text-[var(--z-soft)]">
											{formatScheduleTime(preset.date)}
										</span>
									</button>
								{/each}
								<div class="my-1.5 border-t border-[var(--z-hairline)]"></div>
								<div class="flex flex-col gap-1.5 px-1.5 pt-1 pb-1">
									<label class="text-xs text-[var(--z-soft)]" for="compose-schedule-{draft.id}">
										Pick date &amp; time
									</label>
									<input
										id="compose-schedule-{draft.id}"
										type="datetime-local"
										class="z-field z-mono !text-[12.5px]"
										min={customMin}
										value={customSendTime}
										oninput={(event) =>
											(customSendTime = (event.currentTarget as HTMLInputElement).value)}
									/>
									<button
										type="button"
										class="btn-tactile !h-8 !border-[var(--z-ch-needs-solid)] !bg-[var(--z-ch-needs-fill)] !text-[12.5px] !font-semibold !text-[var(--z-ch-needs-ink)]" disabled={!customSendTime}
										onclick={pickCustomSendAt}
									>
										Schedule
									</button>
								</div>
							</Popover.Content>
						</Popover.Positioner>
					</Portal>
				</Popover.Root>
		<span class="h-5 w-px shrink-0 bg-[var(--z-hairline)]" aria-hidden="true"></span>
		<RichToolbar id={toolsId} off={draft.plain} class="overflow-x-auto" />
		<button
			type="button"
			class="z-icon-btn !w-auto shrink-0 px-1.5 text-[11.5px] font-semibold {draft.plain
				? '!bg-[var(--z-accent-soft)] !text-[var(--z-accent-edge)]'
				: ''}"
			aria-pressed={draft.plain}
			title={draft.plain ? 'Switch to rich text' : 'Switch to plain text — formatting is dropped'}
			onclick={() => compose.setPlain(draft.id, !draft.plain)}
		>
			Plain
		</button>
		<button
			type="button"
			class="ml-auto btn-tactile btn-danger !size-[30px] !p-0"
			aria-label="Discard draft"
			title="Discard draft"
			onclick={() => compose.discard(draft.id)}
		>
				<ActionIcon name="trash" class="size-[18px]" />
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
				<path d="M6.5 0.5L0.5 6.5M6.5 4L4 6.5" stroke="var(--z-faint)" stroke-width="1.5" stroke-linecap="round" />
			</svg>
		</div>
	{/if}
</div>
