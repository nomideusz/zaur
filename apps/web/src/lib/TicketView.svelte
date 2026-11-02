<script lang="ts">
	// What a phone opens after scanning the machine's QR code: the sample booking,
	// read back from the address alone. Fills the screen as the poster's orange row.
	import { googleCalendarUrl, outlookCalendarUrl, toIcs, type TimelineEvent } from '@nomideusz/svelte-calendar';
	import { t } from '#lib/i18n';
	import type { Ticket } from './ticket';

	let { ticket, locale, onclose }: { ticket: Ticket; locale: string; onclose: () => void } = $props();

	const when = $derived(new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(ticket.start));
	const money = $derived(new Intl.NumberFormat(locale, { style: 'currency', currency: 'PLN' }));
	const event = $derived<TimelineEvent>({ id: ticket.ref, title: ticket.title, start: new Date(ticket.start), end: new Date(ticket.start + ticket.minutes * 60_000) });

	function save() {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([toIcs([event], { name: ticket.title })], { type: 'text/calendar' }));
		a.download = `${ticket.ref}.ics`;
		a.click();
		URL.revokeObjectURL(a.href);
	}
</script>

<div class="ticket" role="dialog" aria-modal="true" aria-labelledby="ticket-name">
	<p class="sample">{t('ticket.sample')}</p>
	<h2 id="ticket-name">{ticket.title}</h2>
	<p class="when">{when}</p>
	<dl>
		<div><dt>{t('ticket.guests')}</dt><dd>{ticket.people}</dd></div>
		<div><dt>{t('ticket.total')}</dt><dd>{money.format(ticket.total / 100)}</dd></div>
		<div><dt>{t('ticket.ref')}</dt><dd>{ticket.ref}</dd></div>
		{#if ticket.refunded}<div class="void"><dt>{t('ticket.cancelled')}</dt><dd>{money.format(ticket.refunded / 100)}</dd></div>{/if}
	</dl>
	<p class="add">
		<a href={googleCalendarUrl(event)} target="_blank" rel="noopener">Google Calendar</a>
		<a href={outlookCalendarUrl(event)} target="_blank" rel="noopener">Outlook</a>
		<button type="button" onclick={save}>{t('ticket.ics')}</button>
	</p>
	<p class="how">{t('ticket.how')}</p>
	<button type="button" class="close" onclick={onclose}>{t('ticket.close')}</button>
</div>

<style>
	.ticket {
		position: fixed;
		inset: 0;
		z-index: 5;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem max(1rem, 1.39vw);
		overflow: auto;
		background: var(--orange);
		color: var(--ink);
	}
	.sample {
		font-weight: 700;
	}
	h2 {
		margin: auto 0 0;
		font-weight: 800;
		font-size: clamp(3rem, 15vw, 11rem);
		line-height: 0.95;
		letter-spacing: -0.04em;
		overflow-wrap: anywhere;
	}
	.when {
		font-weight: 700;
		font-size: max(1.25rem, 2vw);
		line-height: 1.15;
	}
	dl {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0;
		border-top: var(--rule) solid var(--orange-rule);
	}
	dd {
		font-weight: 700;
	}
	.void {
		background: var(--ink);
		color: var(--paper);
		padding-inline: 0.6rem;
	}
	.add {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		align-items: center;
	}
	.add a,
	.add button {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		font-weight: 700;
		text-decoration: underline;
		text-decoration-thickness: var(--rule);
		text-underline-offset: 0.2em;
		cursor: pointer;
	}
	.how {
		max-width: 52ch;
	}
	.close {
		align-self: flex-start;
		min-height: 2.75rem;
		padding: 0 1rem;
		border: 0;
		border-radius: 3px;
		background: var(--ink);
		color: var(--paper);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.close:focus-visible {
		outline-offset: 3px;
	}
</style>
