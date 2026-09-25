<script lang="ts">
	import { untrack } from 'svelte';
	import type { Calendar, CalendarShareRole } from '@zaur/mail-core';
	import { CALENDAR_COLORS, calendarDeleteBlockedReason, calendarKey, shareRoleFromRights } from '@zaur/mail-core';
	import { messageOf } from '#lib/errors';
	import {
		deleteCalendar,
		makeDefaultCalendar,
		setCalendarShare,
		shareCalendar,
		sharePeople,
		updateCalendar
	} from '../../../routes/calendar.remote';

	/**
	 * One calendar's settings, in the rail where an event's editor goes: its
	 * name and colour, whether new events land in it, who else sees it, and
	 * the way to delete it. Each part is offered only where the calendar's
	 * rights allow it; the server has the last word on the rest.
	 */
	let {
		calendar,
		calendars,
		own,
		canShare,
		onDone,
		onClose
	}: {
		calendar: Calendar;
		calendars: Calendar[];
		/** In your own account — the only one with a default, and where deleting is yours to do. */
		own: boolean;
		/** The server has a directory to share through. */
		canShare: boolean;
		/** Something happened worth saying on the page; `closed` when the calendar is gone. */
		onDone: (message: string, closed?: boolean) => void;
		onClose: () => void;
	} = $props();

	const key = $derived(calendarKey(calendar));
	let name = $state('');
	let color = $state('');
	// Another calendar resets the form; a refresh of this one (a share landing) does not.
	$effect(() => {
		key;
		untrack(() => {
			name = calendar.name;
			color = calendar.color;
		});
	});

	let busy = $state(false);
	let error = $state<string | null>(null);

	async function run(work: () => Promise<unknown>, fallback: string): Promise<boolean> {
		busy = true;
		error = null;
		try {
			await work();
			return true;
		} catch (cause) {
			error = messageOf(cause, fallback);
			return false;
		} finally {
			busy = false;
		}
	}

	const where = $derived({ id: calendar.id, accountId: calendar.accountId });
	const changed = $derived(name.trim() !== calendar.name || color !== calendar.color);
	const swatches = $derived(CALENDAR_COLORS.includes(calendar.color) ? CALENDAR_COLORS : [calendar.color, ...CALENDAR_COLORS]);
	const writable = $derived(calendar.myRights.mayWriteAll || calendar.myRights.mayWriteOwn);
	const blocked = $derived(calendarDeleteBlockedReason(calendar, calendars));

	async function save(submitted: SubmitEvent) {
		submitted.preventDefault();
		if (!changed || !name.trim()) return;
		if (await run(() => updateCalendar({ ...where, name, color }), 'The calendar could not be saved.'))
			onDone('Calendar saved');
	}

	async function makeDefault() {
		if (await run(() => makeDefaultCalendar({ id: calendar.id }), 'Could not make it the default.'))
			onDone(`New events go in “${calendar.name}” now`);
	}

	async function remove() {
		const title = calendar.name;
		if (!confirm(`Delete “${title}”?`)) return;
		let deleted = false;
		await run(async () => {
			deleted = (await deleteCalendar({ ...where, removeEvents: false })).deleted;
			if (deleted || !confirm(`“${title}” still has events. Delete them with it? This cannot be undone.`)) return;
			deleted = (await deleteCalendar({ ...where, removeEvents: true })).deleted;
		}, 'The calendar could not be deleted.');
		if (deleted) onDone(`Deleted “${title}”`, true);
	}

	/* ── Sharing ──────────────────────────────────────────────────────── */

	const ROLES: { value: CalendarShareRole; label: string }[] = [
		{ value: 'read', label: 'Can view' },
		{ value: 'write', label: 'Can edit' }
	];
	const shares = $derived(Object.entries(calendar.shareWith ?? {}));
	const peopleQuery = $derived(shares.length ? sharePeople(shares.map(([id]) => id)) : undefined);
	const people = $derived(new Map((peopleQuery?.current ?? []).map((person) => [person.id, person])));

	let email = $state('');
	let role = $state<CalendarShareRole>('read');

	async function share(submitted: SubmitEvent) {
		submitted.preventDefault();
		if (!email.trim()) return;
		let who = '';
		const ok = await run(async () => {
			const { person } = await shareCalendar({ ...where, email, role });
			who = person.name || person.email || 'them';
		}, 'Could not share the calendar.');
		if (ok) {
			email = '';
			onDone(`Shared with ${who}`);
		}
	}

	const label = 'block text-[12px] text-[var(--z-soft)]';
</script>

<div class="flex h-full flex-col">
	<div class="flex items-center justify-between gap-3 border-b border-[var(--z-hairline)] px-6 py-3 max-md:px-4">
		<h2 class="min-w-0 truncate text-[14px] font-semibold text-[var(--z-ink)]">{calendar.name}</h2>
		<button type="button" class="btn-tactile !h-[30px] shrink-0" onclick={onClose}>Done</button>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
		<div class="mx-auto flex max-w-[560px] flex-col gap-6">
			{#if error}
				<p class="rounded-[8px] border border-[var(--z-ch-discard-line)] bg-[var(--z-ch-discard-hover)] px-3 py-2 text-[13px] text-[var(--z-ch-discard-ink)]" role="alert">{error}</p>
			{/if}
			{#if !own}
				<p class="rounded-[8px] border border-[var(--z-hairline)] bg-[var(--z-hover)] px-3 py-2 text-[12.5px] text-[var(--z-muted)]">
					Shared with you. You can {writable ? 'add and edit' : 'only see'} its events.
				</p>
			{/if}

			<form class="flex flex-col gap-4" onsubmit={save}>
				<label>
					<span class={label}>Name</span>
					<input class="z-field mt-1 w-full max-md:text-base" bind:value={name} required maxlength="200" autocomplete="off" />
				</label>
				<fieldset>
					<legend class={label}>Colour</legend>
					<div class="mt-1.5 flex flex-wrap gap-2">
						{#each swatches as swatch (swatch)}
							<button
								type="button"
								class="size-[26px] rounded-full border-2 transition-transform hover:scale-110 {color === swatch
									? 'border-[var(--z-ink)]'
									: 'border-transparent'}"
								style:background={swatch}
								aria-label={swatch}
								aria-pressed={color === swatch}
								onclick={() => (color = swatch)}
							></button>
						{/each}
					</div>
				</fieldset>
				<div>
					<button type="submit" class="btn-tactile btn-primary !h-[30px]" disabled={!changed || !name.trim() || busy}>Save</button>
				</div>
			</form>

			{#if own && writable}
				<section>
					<h3 class="z-caption mb-1.5">Default</h3>
					{#if calendar.isDefault}
						<p class="text-[13px] text-[var(--z-muted)]">New events go in this calendar.</p>
					{:else}
						<button type="button" class="btn-tactile !h-[30px]" onclick={makeDefault} disabled={busy}>Make it the default</button>
					{/if}
				</section>
			{/if}

			{#if canShare && calendar.myRights.mayShare}
				<section>
					<h3 class="z-caption mb-1.5">Shared with</h3>
					{#if shares.length}
						<ul class="mb-3 divide-y divide-[var(--z-hairline)]" role="list">
							{#each shares as [principalId, rights] (principalId)}
								{@const person = people.get(principalId)}
								<li class="flex items-center gap-2 py-2">
									<span class="min-w-0 flex-1">
										<span class="block truncate text-[13.5px] font-medium text-[var(--z-body)]">{person?.name || person?.email || principalId}</span>
										{#if person?.name && person.email}<span class="block truncate text-[12px] text-[var(--z-soft)]">{person.email}</span>{/if}
									</span>
									<select
										class="z-field !h-[28px] w-[104px] shrink-0 text-[12.5px]"
										aria-label="Access for {person?.name || person?.email || principalId}"
										value={shareRoleFromRights(rights)}
										disabled={busy}
										onchange={(changed) => {
											const next = changed.currentTarget.value as CalendarShareRole;
											void run(() => setCalendarShare({ ...where, principalId, role: next }), 'Could not change their access.');
										}}
									>
										{#each ROLES as option (option.value)}<option value={option.value}>{option.label}</option>{/each}
									</select>
									<button
										type="button"
										class="btn-tactile !h-[28px] shrink-0 text-[12px]"
										disabled={busy}
										onclick={() => void run(() => setCalendarShare({ ...where, principalId, role: null }), 'Could not remove their access.')}
									>
										Remove
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="mb-3 text-[13px] text-[var(--z-muted)]">Nobody else sees this calendar.</p>
					{/if}
					<form class="flex flex-wrap items-center gap-2" onsubmit={share}>
						<input
							type="email"
							class="z-field !h-[30px] min-w-0 flex-1 basis-[180px] max-md:text-base"
							placeholder="colleague@zaur.app"
							aria-label="Share with"
							bind:value={email}
							autocomplete="off"
							disabled={busy}
						/>
						<select class="z-field !h-[30px] w-[104px] shrink-0 text-[12.5px]" aria-label="Access" bind:value={role} disabled={busy}>
							{#each ROLES as option (option.value)}<option value={option.value}>{option.label}</option>{/each}
						</select>
						<button type="submit" class="btn-tactile !h-[30px] shrink-0" disabled={busy || !email.trim()}>Share</button>
					</form>
					<p class="mt-2 text-[12px] text-[var(--z-soft)]">People with an account on this mail server.</p>
				</section>
			{/if}

			{#if calendar.myRights.mayDelete}
				<section>
					<h3 class="z-caption mb-1.5">Delete</h3>
					{#if blocked}
						<p class="text-[13px] text-[var(--z-muted)]">{blocked}</p>
					{:else}
						<button type="button" class="btn-tactile btn-danger !h-[30px]" onclick={remove} disabled={busy}>Delete calendar</button>
					{/if}
				</section>
			{/if}
		</div>
	</div>
</div>
