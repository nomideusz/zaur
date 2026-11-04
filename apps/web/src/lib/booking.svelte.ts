// One sample booking running through five packages, the way they meet on Szkoły
// Jogi and thebest.travel: svelte-calendar picks the class, svelte-scheduler
// prices it, svelte-payments keeps its ledger, svelte-notify writes its emails
// and svelte-qr carries its ticket. Every line on the tape is a call that just
// ran in this tab, with what it returned. No money moves and nothing is sent.
import { CANCELLATION_POLICIES, calculatePrice, calculateRefund, generateBookingReference, type PriceStructure } from '@nomideusz/svelte-scheduler';
import { chargeKey, derivePaymentStatus, executeKeyedOperation, refundKey, type LedgerEvent } from '@nomideusz/svelte-payments/ledger';
import { bookingConfirmationTemplate, cancellationTemplate } from '@nomideusz/svelte-notify';
import { encodeTicket, ticketHash, type Ticket } from './ticket';

export const policies = ['flexible', 'moderate', 'strict', 'no_refund'] as const;
export type Policy = (typeof policies)[number];
export type Pkg = 'svelte-calendar' | 'svelte-scheduler' | 'svelte-payments' | 'svelte-notify' | 'svelte-qr';
export type Line = { id: number; pkg: string; call: string; out: string; stopped?: boolean };

export const discountFrom = 3;
const pricing: Omit<PriceStructure, 'basePrice'> = {
	model: 'per_person',
	currency: 'PLN',
	groupDiscountsEnabled: true,
	groupDiscountTiers: [{ id: 'group', minParticipants: discountFrom, maxParticipants: 6, discountType: 'percentage', discountValue: 10 }],
	guidePaysProcessingFee: false
};
/** A longer class costs more; an imported event of any length gets the nearest rate. */
const rateFor = (minutes: number) => (minutes >= 120 ? 80 : minutes >= 90 ? 65 : minutes >= 75 ? 55 : 45);
const grosze = (x: number) => Math.round(x * 100);
const pln = (x: number) => `${x.toFixed(2)} PLN`;
/** The wall-clock time the calendar shows; toISOString would print UTC. */
const wall = (d: Date) => new Date(+d - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

// The class's next Monday or Thursday at 18:00, never today: at most four days off, so
// always in the five days the calendar shows. Read in the browser only: a date baked in
// at build would be stale by the next visit. The fixed date keeps the prerender stable.
function nextVinyasa() {
	const d = new Date();
	const until = (day: number) => (day - d.getDay() + 7) % 7 || 7;
	d.setDate(d.getDate() + Math.min(until(1), until(4)));
	d.setHours(18, 0, 0, 0);
	return +d;
}

export const booking = $state({
	title: 'Vinyasa',
	eventId: '',
	start: +new Date(2026, 0, 1, 18),
	minutes: 75,
	people: 2,
	policy: 'moderate' as Policy,
	hours: 36,
	mail: 'confirmation' as 'confirmation' | 'cancellation',
	ref: 'ZR-7K2M9Q4D',
	paid: false,
	refunded: 0,
	/** The package the signal is passing through right now. */
	hot: null as Pkg | null,
	stopped: false,
	tape: [] as Line[]
});

export const rate = () => rateFor(booking.minutes);

export function quote() {
	const price = calculatePrice({ pricing: { ...pricing, basePrice: rate() }, participants: booking.people });
	const refund = calculateRefund(
		price.totalAmount,
		CANCELLATION_POLICIES[booking.policy],
		new Date(booking.start),
		'guest',
		new Date(booking.start - booking.hours * 3_600_000)
	);
	const totalMinor = grosze(price.totalAmount);
	const refundMinor = grosze(refund.refundAmount);
	return {
		price,
		refund,
		totalMinor,
		refundMinor,
		chargeKey: chargeKey(booking.ref),
		refundKey: refundMinor > 0 ? refundKey(booking.ref, refundMinor) : null,
		status: booking.paid ? derivePaymentStatus(totalMinor, Math.min(booking.refunded, totalMinor)) : 'unpaid'
	};
}

// The ledger table a real app keeps in its database: insert must be atomic on
// the key, which a Map is in one tab. It maps each claimed key to its amount.
const claimed = new Map<string, number>();
const store = {
	insert: async (e: LedgerEvent) => !claimed.has(e.eventKey) && !!claimed.set(e.eventKey, e.amount),
	markCompleted: async () => {}
};
export const ledger = $state({ rows: [] as { key: string; kind: 'charge' | 'refund'; amount: number }[] });

let lineId = 0;
function log(pkg: Pkg, call: string, out: string, stopped = false) {
	const fn = call.slice(0, call.indexOf('('));
	const line = { id: ++lineId, pkg, call, out, stopped };
	// A slider sends a call per pixel: it rewrites its own line instead of flooding the tape.
	if (booking.tape[0]?.call.startsWith(`${fn}(`) && fn === 'calculateRefund') booking.tape[0] = line;
	else booking.tape = [line, ...booking.tape].slice(0, 40);
}

const moved = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise((go) => setTimeout(go, moved() ? 0 : ms));
let runs = 0;

/** The signal passes through one package: its head lights, and it does its work. */
async function pass(pkg: Pkg, work: () => void | Promise<void>, run: number) {
	if (run !== runs) return;
	booking.hot = pkg;
	await work();
	await wait(420);
}

async function charge() {
	const q = quote();
	const event: LedgerEvent = { eventKey: q.chargeKey, type: 'charge', subjectId: booking.ref, paymentId: 'tr_sample', amount: q.totalMinor, currency: 'PLN' };
	const out = await executeKeyedOperation(store, event, async () => ({ id: 'tr_sample' }));
	if (out.status === 'executed') {
		booking.paid = true;
		ledger.rows = [...ledger.rows, { key: q.chargeKey, kind: 'charge', amount: q.totalMinor }];
	}
	booking.stopped = out.status === 'duplicate';
	log('svelte-payments', `executeKeyedOperation(store, { eventKey: '${q.chargeKey}', amount: ${q.totalMinor} })`, out.status, out.status === 'duplicate');
}

/** A new booking runs the whole way: price, charge, email, ticket. */
export async function run() {
	const me = ++runs;
	claimed.clear();
	ledger.rows = [];
	booking.ref = generateBookingReference('ZR');
	booking.paid = false;
	booking.refunded = 0;
	booking.stopped = false;
	booking.mail = 'confirmation';
	await pass(
		'svelte-scheduler',
		() => {
			const { totalAmount } = quote().price;
			log('svelte-scheduler', `calculatePrice({ basePrice: ${rate()}, participants: ${booking.people} })`, pln(totalAmount));
		},
		me
	);
	await pass('svelte-payments', charge, me);
	await pass('svelte-notify', () => log('svelte-notify', `bookingConfirmationTemplate({ serviceName: '${booking.title}', totalAmount: ${quote().totalMinor} })`, 'subject + html + text'), me);
	await pass('svelte-qr', () => log('svelte-qr', `getQrMatrix(ticketUrl, { errorCorrection: 'H' })`, `${booking.ref}`), me);
	if (me === runs) booking.hot = null;
}

/** First view: the next Vinyasa, booked once, so the machine is seen working. */
export function start() {
	if (booking.tape.length) return;
	booking.start = nextVinyasa();
	void run();
}

export function pick(id: string, title: string, start: Date, end: Date) {
	booking.eventId = id;
	booking.title = title;
	booking.start = +start;
	booking.minutes = Math.round((+end - +start) / 60_000);
	log('svelte-calendar', `oneventclick({ title: '${title}' })`, wall(start));
	void run();
}

/** A dragged class keeps its booking: the email and the ticket follow it. */
export function moveClass(id: string, start: Date, end: Date) {
	if (id !== booking.eventId) return;
	booking.start = +start;
	booking.minutes = Math.round((+end - +start) / 60_000);
	log('svelte-calendar', `oneventmove({ title: '${booking.title}' })`, wall(start));
}

export function rebook(people: number) {
	booking.people = people;
	void run();
}

export function requote() {
	const { refund } = quote();
	log('svelte-scheduler', `calculateRefund(total, ${booking.policy}, { hoursBefore: ${booking.hours} })`, `${refund.refundPercentage}% · ${pln(refund.refundAmount)}`);
}

export const payAgain = async () => {
	await charge();
};

// A refund key names the total refunded after it, so only a higher total is a
// new movement; a key already in the ledger can be sent again, to replay it.
export const canRefund = (q: ReturnType<typeof quote>) => booking.paid && !!q.refundKey && (claimed.has(q.refundKey) || q.refundMinor > booking.refunded);

export async function sendRefund() {
	const q = quote();
	if (!q.refundKey || !canRefund(q)) return;
	const amount = claimed.get(q.refundKey) ?? q.refundMinor - booking.refunded;
	const event: LedgerEvent = { eventKey: q.refundKey, type: 'refund', subjectId: booking.ref, paymentId: 'tr_sample', amount, currency: 'PLN' };
	const out = await executeKeyedOperation(store, event, async () => ({ id: 're_sample' }));
	booking.stopped = out.status === 'duplicate';
	log('svelte-payments', `executeKeyedOperation(store, { eventKey: '${q.refundKey}', amount: ${amount} })`, out.status, out.status === 'duplicate');
	if (out.status === 'executed') {
		booking.refunded = q.refundMinor;
		ledger.rows = [...ledger.rows, { key: q.refundKey, kind: 'refund', amount }];
		booking.mail = 'cancellation';
		log('svelte-notify', `cancellationTemplate({ refundAmount: ${q.refundMinor} })`, 'subject + html + text');
	}
}

export const ticketOf = (): Ticket => ({
	title: booking.title,
	start: booking.start,
	minutes: booking.minutes,
	people: booking.people,
	total: quote().totalMinor,
	refunded: booking.refunded,
	ref: booking.ref
});
export const ticketUrl = (site: string) => `${site}${ticketHash}${encodeTicket(ticketOf())}`;

export function email(language: string, verifyUrl: string) {
	const q = quote();
	const data = {
		guestName: 'Ola',
		guestEmail: 'ola@example.com',
		serviceName: booking.title,
		slotStartTime: new Date(booking.start),
		participants: booking.people,
		totalAmount: q.totalMinor,
		currency: 'PLN',
		bookingReference: booking.ref,
		providerName: 'Szkoły Jogi',
		language,
		brand: 'zaur.app',
		theme: { accent: '#e75926', radius: '3px', text: '#0b0a09', muted: '#4a4842', canvas: '#f8f6f1' },
		verifyUrl
	};
	return booking.mail === 'cancellation' ? cancellationTemplate({ ...data, cancelledBy: 'guest', refundAmount: booking.refunded || q.refundMinor }) : bookingConfirmationTemplate(data);
}
