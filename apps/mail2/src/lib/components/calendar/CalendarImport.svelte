<script lang="ts">
	import type { Calendar } from '@zaur/mail-core';
	import { CALENDAR_COLORS, calendarAllowsWrites, calendarKey } from '@zaur/mail-core';
	import { messageOf } from '#lib/errors';
	import { prefs, setPref } from '#lib/settings.svelte.ts';
	import { MAX_FEEDS } from '#lib/settings';
	import { isFeed, newFeedId, parsed } from '#lib/calendar/feeds';
	import { importEvents } from '../../../routes/calendar.remote';
	import { calendarFeed } from '../../../routes/feeds.remote';

	/**
	 * Other calendars, two ways: an .ics file copied once into one of yours,
	 * or a link (Google, iCloud, Outlook) followed from then on, read-only.
	 */
	let {
		calendars,
		onDone,
		onClose
	}: {
		calendars: Calendar[];
		/** Something landed: said on the page, and the grid asks again. */
		onDone: (message: string) => void;
		onClose: () => void;
	} = $props();

	const label = 'block text-[12px] text-[var(--z-soft)]';
	const targets = $derived(calendars.filter((calendar) => calendarAllowsWrites(calendar) && !isFeed(calendar)));

	/* ── A file ───────────────────────────────────────────────────────── */

	let file = $state<File | null>(null);
	let target = $state('');
	const chosen = $derived(
		targets.find((calendar) => calendarKey(calendar) === target) ??
			targets.find((calendar) => calendar.isDefault) ??
			targets[0] ??
			null
	);
	let importing = $state(false);
	let importError = $state<string | null>(null);

	async function importFile(submitted: SubmitEvent) {
		submitted.preventDefault();
		if (!file || !chosen) return;
		importing = true;
		importError = null;
		try {
			const { imported, existing, failed, reason } = await importEvents({
				calendarId: chosen.id,
				accountId: chosen.accountId || undefined,
				ics: await file.text()
			});
			if (!imported && !existing && failed) {
				importError = reason ?? 'None of its events could be imported.';
				return;
			}
			const parts = [`Imported ${imported} ${imported === 1 ? 'event' : 'events'} into “${chosen.name}”`];
			if (existing) parts.push(`${existing} already there`);
			if (failed) parts.push(`${failed} could not be read`);
			onDone(parts.join(', '));
			file = null;
		} catch (cause) {
			importError = messageOf(cause, 'The file could not be imported.');
		} finally {
			importing = false;
		}
	}

	/* ── A link ───────────────────────────────────────────────────────── */

	let url = $state('');
	let subscribing = $state(false);
	let subscribeError = $state<string | null>(null);
	const full = $derived(prefs.calendarFeeds.length >= MAX_FEEDS);

	async function subscribe(submitted: SubmitEvent) {
		submitted.preventDefault();
		const link = url.trim();
		if (!link || full) return;
		if (prefs.calendarFeeds.some((feed) => feed.url === link)) {
			subscribeError = 'You already follow that calendar.';
			return;
		}
		subscribing = true;
		subscribeError = null;
		try {
			// Fetched before it is kept: a link that does not answer is said now, not as an empty calendar.
			const calendar = parsed(await calendarFeed(link));
			const used = new Set(calendars.map((c) => c.color));
			const name = calendar.name?.trim().slice(0, 200) || hostOf(link);
			setPref('calendarFeeds', [
				...prefs.calendarFeeds,
				{
					id: newFeedId(),
					name,
					url: link,
					color: calendar.color && /^#[0-9a-f]{6}$/i.test(calendar.color) ? calendar.color : (CALENDAR_COLORS.find((c) => !used.has(c)) ?? CALENDAR_COLORS[5]!),
					visible: true
				}
			]);
			url = '';
			onDone(`Subscribed to “${name}”`);
		} catch (cause) {
			subscribeError = messageOf(cause, 'Could not subscribe to that calendar.');
		} finally {
			subscribing = false;
		}
	}

	function hostOf(link: string): string {
		try {
			return new URL(link.replace(/^webcal:/i, 'https:')).hostname;
		} catch {
			return 'Calendar';
		}
	}
</script>

<div class="flex h-full flex-col">
	<div class="flex items-center justify-between gap-3 border-b border-[var(--z-hairline)] px-6 py-3 max-md:px-4">
		<h2 class="min-w-0 truncate text-[14px] font-semibold text-[var(--z-ink)]">Import or subscribe</h2>
		<button type="button" class="btn-tactile !h-[30px] shrink-0" onclick={onClose}>Done</button>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
		<div class="mx-auto flex max-w-[560px] flex-col gap-8">
			<form class="flex flex-col gap-4" onsubmit={subscribe}>
				<h3 class="z-caption">Subscribe by link</h3>
				{#if subscribeError}
					<p class="z-railed z-alert z-tone-discard" role="alert">{subscribeError}</p>
				{/if}
				<label>
					<span class={label}>Calendar link (iCal / .ics)</span>
					<input
						class="z-field mt-1 w-full max-md:text-base"
						type="url"
						inputmode="url"
						placeholder="https://… or webcal://…"
						bind:value={url}
						maxlength="2000"
						autocomplete="off"
						required
					/>
				</label>
				<div>
					<button type="submit" class="btn-tactile btn-primary !h-[30px]" disabled={subscribing || !url.trim() || full}>
						{subscribing ? 'Checking…' : 'Subscribe'}
					</button>
				</div>
				{#if full}
					<p class="text-[12.5px] text-[var(--z-muted)]">You follow {MAX_FEEDS} calendars, the most there can be. Remove one to add another.</p>
				{/if}
				<details class="text-[12.5px] leading-relaxed text-[var(--z-muted)]">
					<summary class="cursor-pointer text-[var(--z-body)]">Where to find the link</summary>
					<ul class="mt-2 list-disc space-y-1.5 pl-5">
						<li><b>Google Calendar</b>: Settings → the calendar → Integrate calendar → <i>Secret address in iCal format</i> (or the public one, if it is public).</li>
						<li><b>iCloud</b>: Calendar → the share button beside the calendar → <i>Public Calendar</i> → Copy Link.</li>
						<li><b>Outlook</b>: Settings → Calendar → Shared calendars → Publish a calendar → <i>ICS</i> link.</li>
					</ul>
					<p class="mt-2">It is read-only here and refreshes every few minutes; changes are made where it comes from. A secret link is a password to that calendar: it is kept with your account's settings.</p>
				</details>
			</form>

			<form class="flex flex-col gap-4" onsubmit={importFile}>
				<h3 class="z-caption">Import a file</h3>
				{#if importError}
					<p class="z-railed z-alert z-tone-discard" role="alert">{importError}</p>
				{/if}
				{#if targets.length}
					<label>
						<span class={label}>.ics file</span>
						<input
							class="mt-1 block w-full text-[13px] text-[var(--z-body)] file:mr-3 file:rounded-[6px] file:border file:border-[var(--z-line)] file:bg-[var(--z-surface)] file:px-3 file:py-1 file:text-[12.5px]"
							type="file"
							accept=".ics,.ical,.ifb,.icalendar,text/calendar"
							required
							onchange={(changed) => (file = changed.currentTarget.files?.[0] ?? null)}
						/>
					</label>
					<label>
						<span class={label}>Into</span>
						<select
							class="z-field mt-1 w-full max-md:text-base"
							value={chosen ? calendarKey(chosen) : ''}
							onchange={(changed) => (target = changed.currentTarget.value)}
						>
							{#each targets as calendar (calendarKey(calendar))}
								<option value={calendarKey(calendar)}>{calendar.name}</option>
							{/each}
						</select>
					</label>
					<div>
						<button type="submit" class="btn-tactile btn-primary !h-[30px]" disabled={importing || !file || !chosen}>
							{importing ? 'Importing…' : 'Import'}
						</button>
					</div>
					<p class="text-[12.5px] leading-relaxed text-[var(--z-muted)]">
						A copy: its events become yours to edit, and nobody is sent an invitation. Importing the same file again adds nothing twice.
						Export one from Google (Settings → Import &amp; export), iCloud or Outlook.
					</p>
				{:else}
					<p class="text-[12.5px] text-[var(--z-muted)]">You have no calendar to import into. Add one first.</p>
				{/if}
			</form>
		</div>
	</div>
</div>
