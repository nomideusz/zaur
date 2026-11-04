<script lang="ts">
	// Five packages as one running product. It books once when it comes into view
	// (lib/booking), so nobody meets it empty; after that every control reruns the
	// real calls, and the tape shows them. The signal is the head of a cell turning
	// orange as the booking passes through it: light, never a drawn line.
	import { onMount, type Snippet } from 'svelte';
	import CalendarDemo from '#lib/CalendarDemo.svelte';
	import ScratchQr from '#lib/ScratchQr.svelte';
	import Tape from '#lib/Tape.svelte';
	import Install from '#lib/Install.svelte';
	import PhoneFold from '#lib/PhoneFold.svelte';
	import PkgLinks from '#lib/PkgLinks.svelte';
	import UsedIn, { type UsedList } from '#lib/UsedIn.svelte';
	import { opened } from '#lib/opened.svelte';
	import { t } from '#lib/i18n';
	import { booking, canRefund, discountFrom, email, ledger, moveClass, payAgain, pick, policies, quote, rate, rebook, requote, run, sendRefund, start, ticketUrl, type Pkg } from '#lib/booking.svelte';

	let {
		locale,
		language,
		site,
		version,
		npmOf,
		linksOf,
		usedIn
	}: {
		/** The Intl locale, for dates and money. */
		locale: string;
		/** The page's language, which svelte-notify's templates take. */
		language: string;
		site: string;
		version: (id: string) => string;
		npmOf: (id: string) => string | undefined;
		linksOf: (id: string) => { docs?: string; source?: string };
		usedIn: (id: string) => UsedList | null;
	} = $props();

	let root: HTMLElement;
	let awake = $state(false);
	const pln = $derived(new Intl.NumberFormat(locale, { style: 'currency', currency: 'PLN' }));
	const when = $derived(new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));
	const q = $derived(quote());
	const url = $derived(ticketUrl(site));
	const mail = $derived(awake ? email(language, url) : null);

	onMount(() => {
		const seen = new IntersectionObserver(
			([e]) => {
				if (!e.isIntersecting) return;
				seen.disconnect();
				awake = true;
				start();
			},
			// A share of something this tall may never fit a phone screen: any part well inside the view counts.
			{ rootMargin: '-25% 0px' }
		);
		seen.observe(root);
		return () => seen.disconnect();
	});
</script>

<!-- With a gist, the cell folds on a phone to its head and that one line. -->
{#snippet cell(id: Pkg, cls: string, body: Snippet, gist?: Snippet)}
	{@const used = usedIn(id)}
	<section class={['cell', cls, { shut: gist && !opened[id] }]} id="pkg-{id}">
		<header class="head" class:hot={booking.hot === id}>
			<h4><a href={npmOf(id)}>{id}</a></h4>
			<PkgLinks {...linksOf(id)} />
			<span>{version(id)}</span>
			{#if gist}<PhoneFold {id} name={id} />{/if}
		</header>
		{#if gist}<p class="gist">{@render gist()}</p>{/if}
		<div class="inside">
			{@render body()}
			<div class="foot">
				<Install cmd="npm i @nomideusz/{id}" />
				{#if used}<p class="used"><UsedIn list={used} /></p>{/if}
			</div>
		</div>
	</section>
{/snippet}

<div class="machine" id="machine" bind:this={root}>
	<div class="intro">
		<h3>{t('machine.title')}</h3>
		<p>{t('machine.lede')}</p>
		<p class="sample">{t('machine.sample')} <button type="button" onclick={() => run()}>{t('machine.again')}</button></p>
	</div>

	<div class="grid">
		{#snippet calendar()}
			<CalendarDemo locale={locale} bookedId={booking.eventId} bookedAt={booking.start} onpick={(e) => pick(String(e.id), e.title, new Date(e.start), new Date(e.end))} onmove={(e) => moveClass(String(e.id), new Date(e.start), new Date(e.end))} />
			<p class="hint">{t('machine.calendar.hint')}</p>
		{/snippet}
		{@render cell('svelte-calendar', 'cal', calendar)}

		<div class="col settle">
		{#snippet scheduler()}
			<div class="pad">
				<p class="class">
					<b>{booking.title}</b>
					<!-- The date is the browser's, so its line stands empty until then. -->
					<span>{awake ? when.format(booking.start) : ' '}</span>
					<span>{t('machine.price.per', { minutes: booking.minutes, price: pln.format(rate()) })}</span>
				</p>
				<div class="seg" role="group" aria-label={t('machine.price.guests')}>
					<span aria-hidden="true">{t('machine.price.guests')}</span>
					{#each [1, 2, 3, 4, 5, 6] as n (n)}<button type="button" aria-pressed={booking.people === n} onclick={() => rebook(n)}>{n}</button>{/each}
				</div>
				<ul class="sum">
					<li><span>{booking.people} × {pln.format(rate())}</span><span>{pln.format(q.price.basePrice)}</span></li>
					{#if q.price.groupDiscount}<li><span>{t('machine.price.discount', { n: discountFrom })}</span><span>−{pln.format(q.price.groupDiscount)}</span></li>{/if}
					<li><span>{t('machine.price.fee')}</span><span>{pln.format(q.price.processingFee)}</span></li>
					<li class="total"><span>{t('machine.price.total')}</span><span>{pln.format(q.price.totalAmount)}</span></li>
				</ul>
				<div class="seg" role="group" aria-label={t('machine.refund.policy')}>
					<span aria-hidden="true">{t('machine.refund.policy')}</span>
					{#each policies as x (x)}<button type="button" aria-pressed={booking.policy === x} onclick={() => { booking.policy = x; requote(); }}>{t(`machine.refund.${x}`)}</button>{/each}
				</div>
				<div class="refund">
					<label class="range">
						<span>{t('machine.refund.cancel', { h: booking.hours })}</span>
						<input type="range" min="0" max="192" bind:value={booking.hours} oninput={requote} />
					</label>
					<p class="result" aria-live="polite">{t('machine.refund.back', { pct: q.refund.refundPercentage, amount: pln.format(q.refund.refundAmount) })}</p>
				</div>
			</div>
		{/snippet}
		{#snippet schedulerGist()}{t('machine.price.total')} {pln.format(q.price.totalAmount)}{/snippet}
		{@render cell('svelte-scheduler', 'price', scheduler, schedulerGist)}

		{#snippet payments()}
			<div class="pad">
				<ul class="ledger">
					{#each ledger.rows as r (r.key)}
						<li><code>{r.key}</code><span>{r.kind}</span><span>{pln.format(r.amount / 100)}</span></li>
					{:else}
						<li class="none">{t('machine.pay.empty')}</li>
					{/each}
				</ul>
				<p class="status">derivePaymentStatus → <b>{q.status}</b></p>
				<p class="row">
					<button type="button" class="act" onclick={payAgain}>{t(booking.paid ? 'machine.pay.again' : 'machine.pay.pay')} {pln.format(q.price.totalAmount)}</button>
					<button type="button" class="act" disabled={!canRefund(q)} onclick={sendRefund}>{t('machine.pay.refund')} {pln.format(q.refund.refundAmount)}</button>
				</p>
				<p class="result" class:stopped={booking.stopped} aria-live="polite">{t(booking.stopped ? 'machine.pay.stopped' : 'machine.pay.hint')}</p>
			</div>
		{/snippet}
		{#snippet paymentsGist()}derivePaymentStatus → {q.status}{/snippet}
		{@render cell('svelte-payments', 'pay', payments, paymentsGist)}
		</div>

		<div class="col deliver">
		{#snippet notify()}
			<div class="pad">
				<div class="seg" role="group" aria-label={t('machine.mail.label')}>
					{#each ['confirmation', 'cancellation'] as const as m (m)}<button type="button" aria-pressed={booking.mail === m} onclick={() => (booking.mail = m)}>{t(`machine.mail.${m}`)}</button>{/each}
				</div>
				<!-- no scripts and no same origin: the email is markup and nothing else -->
				<div class="mail">{#if mail}<iframe title={mail.subject} srcdoc={mail.html} sandbox=""></iframe>{/if}</div>
			</div>
		{/snippet}
		{#snippet notifyGist()}{mail?.subject ?? '\u00a0'}{/snippet}
		{@render cell('svelte-notify', 'notify', notify, notifyGist)}

		{#snippet qr()}
			<!-- Browser only, like the email: a prerendered ticket would carry the build's date. -->
			<div class="pad">
				{#if awake}<ScratchQr text={url} />{/if}
			</div>
		{/snippet}
		{@render cell('svelte-qr', 'ticket', qr)}
		</div>

		<div class="trace">
			<Tape lines={booking.tape} label={t('machine.tape')} empty={t('machine.tapeEmpty')} />
		</div>
	</div>
</div>

<style>
	.intro {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		gap: 0.4rem 1.39vw;
		align-items: baseline;
		padding: 1.4vw 1.39vw 1.3vw;
		border-bottom: var(--rule) solid var(--ink);
	}
	h3 {
		grid-row: span 2;
		font-weight: 800;
		font-size: max(2rem, 3.6vw);
		line-height: 1.05;
		letter-spacing: -0.035em;
	}
	.sample {
		color: var(--quiet);
		font-size: 0.875rem;
	}
	.sample button {
		margin-left: 0.4rem;
		padding: 0.1rem 0.5rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--ink);
		color: var(--paper);
		font: inherit;
		cursor: pointer;
	}
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.15fr) minmax(0, 1fr);
		grid-template-rows: minmax(0, 1fr) auto;
		border-bottom: var(--rule) solid var(--ink);
	}
	.cell {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	/* A phone's alone: above 900px every cell stands open. */
	.gist {
		display: none;
	}
	.inside {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}
	.cell:target .head:not(.hot) {
		background: var(--chip);
	}
	/* The cells read as the booking runs: left to right, each column downwards. */
	.col {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.cal {
		grid-column: 1;
		grid-row: 1;
		background: var(--paper);
	}
	.settle,
	.deliver {
		grid-row: 1 / span 2;
		border-left: var(--rule) solid var(--ink);
	}
	.settle {
		grid-column: 2;
	}
	.deliver {
		grid-column: 3;
	}
	.pay,
	.notify {
		flex: 1;
	}
	.pay,
	.ticket {
		border-top: var(--rule) solid var(--ink);
	}
	.notify,
	.ticket {
		background: var(--lilac);
	}
	.trace {
		grid-column: 1;
		grid-row: 2;
		position: relative;
		border-top: var(--rule) solid var(--ink);
		background: var(--ink);
	}
	/* The tape scrolls inside the row the email and the ticket set, never growing it. */
	.trace :global(.tape) {
		position: absolute;
		inset: 0;
		min-height: 0;
	}
	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 1rem 0.45rem 1.39vw;
		border-bottom: var(--rule) solid var(--ink);
		background: var(--ground);
		font-variant-numeric: tabular-nums;
	}
	/* The signal: an instant swap, like every other light on this poster. */
	.head.hot {
		background: var(--orange);
	}
	h4 {
		margin: 0;
		font-weight: 700;
		font-size: max(1.125rem, 1.45vw);
		letter-spacing: -0.02em;
	}
	h4 a {
		text-decoration: none;
	}
	h4 a:hover {
		text-decoration: underline;
	}
	.hint {
		padding: 0.5rem 1rem 0.6rem 1.39vw;
		color: var(--quiet);
		font-size: 0.875rem;
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 1rem;
		margin-top: auto;
		padding: 0.5rem 1rem 0.6rem 1.39vw;
	}
	.used {
		color: var(--quiet);
		font-size: 0.875rem;
	}
	.cal .hint {
		border-top: var(--rule) solid var(--ink);
	}
	.ticket .used,
	.notify .used {
		color: var(--ink);
	}
	.pad {
		display: grid;
		gap: 0.7rem;
		align-content: start;
		justify-items: start;
		padding: 0.85rem 1rem 0.85rem 1.39vw;
		font-size: 0.9375rem;
	}
	.class {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.1rem 0.75rem;
	}
	.class b {
		font-weight: 800;
		font-size: max(1.5rem, 2.2vw);
		line-height: 1.1;
		letter-spacing: -0.03em;
	}
	.seg {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		font-weight: 700;
		font-size: 0.875rem;
	}
	.seg span {
		margin-right: 0.35rem;
	}
	.seg button {
		min-width: 2rem;
		height: 1.75rem;
		padding: 0 0.45rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: none;
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}
	.seg button:hover {
		background: var(--chip);
	}
	.seg button[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
	}
	.sum,
	.ledger {
		width: 100%;
		font-variant-numeric: tabular-nums;
		font-size: 0.875rem;
	}
	.sum li,
	.ledger li {
		display: grid;
		gap: 0 0.75rem;
		padding: 0.2rem 0;
		border-top: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
	}
	.sum li {
		grid-template-columns: minmax(0, 1fr) auto;
	}
	.sum .total {
		border-top: var(--rule) solid var(--ink);
		font-weight: 800;
		font-size: max(1.125rem, 1.45vw);
	}
	.ledger li {
		grid-template-columns: minmax(0, 1fr) 3.25rem 5.5rem;
	}
	.ledger li > :last-child {
		text-align: right;
	}
	.ledger code {
		overflow: hidden;
		font: inherit;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.ledger .none {
		display: block;
		color: var(--quiet);
	}
	.range {
		display: grid;
		gap: 0.15rem;
		width: 100%;
		font-weight: 700;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
	}
	.range input {
		width: 100%;
		margin: 0;
		accent-color: var(--ink);
	}
	.status {
		font-size: 0.875rem;
	}
	.status b {
		font-weight: 800;
	}
	.result {
		font-weight: 700;
		font-size: 0.875rem;
	}
	.result.stopped {
		padding: 0.1rem 0.5rem;
		background: var(--orange);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.act {
		min-height: 2.25rem;
		padding: 0 0.75rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--ink);
		color: var(--paper);
		font: inherit;
		font-weight: 700;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
	}
	.act:hover:not(:disabled) {
		background: var(--orange);
		color: var(--ink);
	}
	.act:disabled {
		border-color: color-mix(in srgb, var(--ink) 35%, transparent);
		background: none;
		color: var(--quiet);
		cursor: default;
	}
	.notify .pad {
		flex: 1;
		grid-template-rows: auto 1fr;
	}
	.refund {
		display: grid;
		gap: 0.7rem;
		width: 100%;
	}
	/* Holds the code's height before it renders, so nothing below it moves. */
	.ticket .pad {
		min-height: 34rem;
	}
	.mail {
		width: 100%;
		height: 100%;
		min-height: 24rem;
		border: var(--rule) solid var(--ink);
		background: var(--paper);
	}
	.mail iframe {
		display: block;
		width: 100%;
		height: 100%;
		min-height: 24rem;
		border: 0;
	}
	/* Everything at once: the machine is one screen under the bar, so the signal is
	   seen the whole way. Only a long language or a short window makes it taller. */
	@media (min-width: 1181px) {
		.machine {
			display: flex;
			flex-direction: column;
			min-height: clamp(36rem, 100svh - 3.66vw, 54rem);
		}
		.intro {
			grid-template-columns: minmax(0, 1.5fr) minmax(0, 2.15fr);
			gap: 0.1rem 1.39vw;
			align-items: start;
			padding-block: 0.5rem 0.55rem;
		}
		/* The title and its sample note on the left, so the lede costs two lines at most. */
		h3 {
			grid-row: auto;
			font-size: max(1.75rem, 2.6vw);
		}
		.intro p:not(.sample) {
			grid-area: 1 / 2 / span 2;
			align-self: center;
		}
		.intro p {
			font-size: 0.9375rem;
		}
		.intro .sample {
			font-size: 0.8125rem;
		}
		.grid {
			flex: 1;
		}
		.trace {
			height: clamp(6rem, 14svh, 11rem);
		}
		.head {
			padding-block: 0.25rem 0.2rem;
		}
		h4 {
			font-size: max(1.0625rem, 1.15vw);
		}
		.hint {
			padding-block: 0.3rem;
			font-size: 0.8125rem;
		}
		.foot {
			gap: 0.15rem 0.75rem;
			padding-block: 0.3rem 0.35rem;
		}
		.foot :global(.p-install) {
			font-size: 0.8125rem;
		}
		.used {
			font-size: 0.8125rem;
			line-height: 1.3;
		}
		.pad {
			gap: 0.45rem;
			padding-block: 0.5rem;
		}
		.class b {
			font-size: max(1.25rem, 1.7vw);
		}
		.class span {
			font-size: 0.8125rem;
		}
		.seg button {
			height: 1.5rem;
		}
		.sum li,
		.ledger li {
			padding: 0.1rem 0;
		}
		.sum .total {
			font-size: max(1.0625rem, 1.2vw);
		}
		/* A rerun adds lines; the ledger scrolls instead of pushing the column. */
		.ledger {
			max-height: 3.25rem;
			overflow: auto;
		}
		.refund {
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 0 0.75rem;
		}
		.range {
			grid-area: 1 / 1 / 1 / -1;
		}
		.refund .result {
			grid-area: 1 / 2;
			pointer-events: none;
		}
		.act {
			min-height: 1.875rem;
		}
		.result {
			font-size: 0.8125rem;
			line-height: 1.3;
		}
		/* Holds the code's height before it renders. */
		.ticket .pad {
			min-height: 15rem;
		}
		/* The email as a whole page seen small, scrolling inside what the column leaves. */
		.mail {
			position: relative;
			min-height: 6rem;
			overflow: hidden;
		}
		.mail iframe {
			position: absolute;
			top: 0;
			left: 0;
			width: calc(100% / 0.72);
			height: calc(100% / 0.72);
			min-height: 0;
			transform: scale(0.72);
			transform-origin: 0 0;
		}
	}
	/* A short laptop: the same cells with less air. */
	@media (min-width: 1181px) and (max-height: 760px) {
		.pad {
			gap: 0.3rem;
			padding-block: 0.35rem;
		}
		.foot {
			padding-block: 0.2rem 0.25rem;
		}
	}
	@media (max-width: 1180px) and (min-width: 901px) {
		.grid {
			grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		}
		.trace {
			min-height: 11rem;
		}
		.deliver {
			grid-column: 1 / -1;
			grid-row: 3;
			flex-direction: row;
			border-top: var(--rule) solid var(--ink);
			border-left: 0;
		}
		.notify {
			flex: 1.35;
			min-width: 0;
		}
		.ticket {
			flex: 1;
			min-width: 0;
			border-top: 0;
			border-left: var(--rule) solid var(--ink);
		}
	}
	@media (max-width: 900px) {
		.intro {
			grid-template-columns: minmax(0, 1fr);
			padding: 1.25rem 1rem;
		}
		.class span {
			flex-basis: 100%;
		}
		.grid {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: none;
		}
		.col {
			display: contents;
		}
		.cell,
		.trace {
			grid-column: 1;
			grid-row: auto;
		}
		.price,
		.notify {
			border-top: var(--rule) solid var(--ink);
		}
		.head,
		.pad,
		.foot,
		.hint {
			padding-inline: 1rem;
		}
		.head {
			align-items: center;
		}
		.shut .inside {
			display: none;
		}
		.shut .gist {
			display: block;
			overflow: hidden;
			padding: 0.5rem 1rem;
			font-weight: 700;
			font-size: 0.875rem;
			font-variant-numeric: tabular-nums;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
		.trace {
			min-height: 11rem;
		}
	}
	@media (pointer: coarse) {
		.seg button,
		.act {
			min-width: 2.75rem;
			min-height: 2.75rem;
		}
		.sample button,
		.range input {
			min-height: 2.75rem;
		}
	}
</style>
