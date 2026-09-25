<script lang="ts">
	import { messageOf } from '#lib/errors';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import { whoami } from '../../../session.remote';
	import { vacation as vacationQuery, saveVacation, type VacationDTO } from '../../../settings.remote';

	const who = whoami();
	const vacationResource = $derived(who.current ? vacationQuery() : undefined);

	let status = $state<{ text: string; error?: boolean } | null>(null);

	// One form with one Save: half a vacation (dates, no message) is worse than none.
	let away = $state<Omit<VacationDTO, 'supported'> | null>(null);
	let saving = $state(false);
	$effect(() => {
		const current = vacationResource?.current;
		if (current && !away) away = { isEnabled: current.isEnabled, fromDate: current.fromDate, toDate: current.toDate, subject: current.subject, textBody: current.textBody };
	});
	const dirty = $derived.by(() => {
		const current = vacationResource?.current;
		if (!current || !away) return false;
		return (['isEnabled', 'fromDate', 'toDate', 'subject', 'textBody'] as const).some((key) => away![key] !== current[key]);
	});

	async function persist() {
		if (!away) return;
		saving = true;
		status = null;
		try {
			await saveVacation(away);
			status = { text: away.isEnabled ? 'Auto-reply on' : 'Auto-reply saved, off' };
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not save the auto-reply'), error: true };
		} finally {
			saving = false;
		}
	}
</script>

<StatusNote {status} />

{#if vacationResource?.current?.supported === false}
	<section class="z-card p-4 text-[13px] text-[var(--z-muted)]">This server does not offer an auto-reply.</section>
{:else if vacationResource?.error}
	<section class="z-card p-4 text-[13px] text-[var(--z-ch-discard-ink)]">Could not load your auto-reply.</section>
{:else if !away}
	<section class="z-card z-skeleton h-[180px]" aria-hidden="true"></section>
{:else}
	<section class="z-card">
		<label class="z-card-head cursor-pointer justify-between">
			<span>Reply automatically</span>
			<input type="checkbox" class="z-check" bind:checked={away.isEnabled} />
		</label>
		<div class="z-card-body flex flex-col gap-3 {away.isEnabled ? '' : 'opacity-70'}">
			<div class="grid grid-cols-2 gap-2.5">
				<label class="min-w-0">
					<span class="block text-[12px] text-[var(--z-soft)]">First day</span>
					<input type="date" bind:value={away.fromDate} max={away.toDate || undefined} class="z-field mt-1 w-full max-md:text-base" />
				</label>
				<label class="min-w-0">
					<span class="block text-[12px] text-[var(--z-soft)]">Last day</span>
					<input type="date" bind:value={away.toDate} min={away.fromDate || undefined} class="z-field mt-1 w-full max-md:text-base" />
				</label>
				<span class="col-span-2 text-[11.5px] text-[var(--z-soft)]">Leave empty to start now, or to keep replying until you switch it off.</span>
			</div>
			<label class="block">
				<span class="block text-[12px] text-[var(--z-soft)]">Subject</span>
				<input type="text" maxlength="200" bind:value={away.subject} placeholder="Optional" class="z-field mt-1 w-full max-md:text-base" />
			</label>
			<label class="block">
				<span class="block text-[12px] text-[var(--z-soft)]">Message</span>
				<textarea
					rows="5"
					maxlength="8000"
					bind:value={away.textBody}
					placeholder="I'm away until … and will reply when I'm back."
					class="z-field mt-1 !h-auto w-full resize-y py-2 text-[13px] leading-[1.5] max-md:text-base"
				></textarea>
			</label>
		</div>
		<div class="z-card-foot justify-end">
			<button type="button" class="btn-tactile !h-[30px] {dirty ? 'btn-primary' : ''}" disabled={saving || !dirty} onclick={persist}>
				{saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
			</button>
		</div>
	</section>
{/if}
