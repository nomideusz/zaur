// One sample booking that three package rows share, the way the packages meet
// on Szkoły Jogi and thebest.travel: svelte-scheduler prices it and works out
// a refund, svelte-payments keeps its ledger, svelte-notify writes its emails.
import { CANCELLATION_POLICIES, calculatePrice, calculateRefund, type PriceStructure } from '@nomideusz/svelte-scheduler';
import { chargeKey, derivePaymentStatus, executeKeyedOperation, refundKey, type LedgerEvent } from '@nomideusz/svelte-payments/ledger';
import { bookingConfirmationTemplate, cancellationTemplate } from '@nomideusz/svelte-notify';

export const policies = ['flexible', 'moderate', 'strict', 'no_refund'] as const;
export type Policy = (typeof policies)[number];

// The format generateBookingReference('ZR') makes; fixed, so the prerendered
// page and the browser agree on it.
const ref = 'ZR-7K2M9Q4D';
const pricing: PriceStructure = {
	model: 'per_person',
	basePrice: 55,
	currency: 'PLN',
	groupDiscountsEnabled: true,
	groupDiscountTiers: [{ id: 'group', minParticipants: 3, maxParticipants: 6, discountType: 'percentage', discountValue: 10 }],
	guidePaysProcessingFee: false
};
// A Thursday at 18:00, the Vinyasa class in the calendar case. Refunds only
// care about the hours before it, so any Thursday does.
export const thursday = new Date(2026, 0, 1, 18);
export const discountFrom = 3;
export const perPerson = pricing.basePrice;

export const booking = $state({
	people: 2,
	policy: 'moderate' as Policy,
	hours: 36,
	mail: 'confirmation' as 'confirmation' | 'cancellation',
	refunded: 0,
	refunds: [] as { key: string; amount: number }[],
	log: [] as { status: 'executed' | 'duplicate'; key: string }[]
});

// Scheduler works in złoty, payments and notify in grosze: convert once, here.
const minor = (x: number) => Math.round(x * 100);

export function quote() {
	const price = calculatePrice({ pricing, participants: booking.people });
	const policy = CANCELLATION_POLICIES[booking.policy];
	const refund = calculateRefund(price.totalAmount, policy, thursday, 'guest', new Date(+thursday - booking.hours * 3_600_000));
	const totalMinor = minor(price.totalAmount);
	const refundMinor = minor(refund.refundAmount);
	return {
		price,
		refund,
		totalMinor,
		refundMinor,
		charge: chargeKey(ref),
		refundKey: refundMinor > 0 ? refundKey(ref, refundMinor) : null,
		status: derivePaymentStatus(totalMinor, Math.min(booking.refunded, totalMinor))
	};
}

// The ledger table a real app keeps in its database: insert must be atomic on
// the key, which a Map is in one tab. It maps each claimed key to its amount.
const claimed = new Map<string, number>();
const store = {
	insert: async (e: LedgerEvent) => !claimed.has(e.eventKey) && !!claimed.set(e.eventKey, e.amount),
	markCompleted: async () => {}
};

export function rebook(people: number) {
	booking.people = people;
	booking.refunded = 0;
	booking.refunds = [];
	booking.log = [];
	claimed.clear();
}

// A refund key names the total refunded after it, so only a higher total is a
// new movement; a key already in the ledger can be sent again, to replay it.
export const canRefund = (q: ReturnType<typeof quote>) => !!q.refundKey && (claimed.has(q.refundKey) || q.refundMinor > booking.refunded);

export async function sendRefund() {
	const q = quote();
	if (!q.refundKey || !canRefund(q)) return;
	const amount = claimed.get(q.refundKey) ?? q.refundMinor - booking.refunded;
	const event: LedgerEvent = { eventKey: q.refundKey, type: 'refund', subjectId: ref, paymentId: 'tr_sample', amount, currency: 'PLN' };
	const out = await executeKeyedOperation(store, event, async () => ({ id: 're_sample' }));
	if (out.status === 'executed') {
		booking.refunded = q.refundMinor;
		booking.refunds.push({ key: q.refundKey, amount });
	}
	booking.log = [{ status: out.status, key: q.refundKey }, ...booking.log].slice(0, 3);
}

// The class's next Thursday at 18:00, read in the browser only: a date baked in
// at build would be stale by the next visit.
function nextThursday() {
	const d = new Date();
	d.setDate(d.getDate() + ((11 - d.getDay()) % 7 || 7));
	d.setHours(18, 0, 0, 0);
	return d;
}

export function email(language: string, verifyUrl: string) {
	const q = quote();
	const data = {
		guestName: 'Ola',
		guestEmail: 'ola@example.com',
		serviceName: 'Vinyasa',
		slotStartTime: nextThursday(),
		participants: booking.people,
		totalAmount: q.totalMinor,
		currency: 'PLN',
		bookingReference: ref,
		providerName: 'Szkoły Jogi',
		language,
		brand: 'zaur.app',
		theme: { accent: '#e75926', radius: '3px', text: '#0b0a09', muted: '#4a4842', canvas: '#f8f6f1' },
		verifyUrl
	};
	return booking.mail === 'cancellation'
		? cancellationTemplate({ ...data, cancelledBy: 'guest', refundAmount: q.refundMinor })
		: bookingConfirmationTemplate(data);
}
