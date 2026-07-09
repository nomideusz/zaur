import type { JMAPClient } from '$lib/jmap/client';
import type { JMAPVacationResponse } from '$lib/jmap/types';

export { vacationDateInputValue, vacationDateToUtc } from '$lib/utils/vacation-dates';

/**
 * The account's vacation auto-reply (JMAP VacationResponse singleton).
 * 'unavailable' means the server does not advertise the capability.
 */
class VacationStore {
	status = $state<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
	saving = $state(false);

	isEnabled = $state(false);
	fromDate = $state<string | null>(null);
	toDate = $state<string | null>(null);
	subject = $state('');
	textBody = $state('');

	private accountId: string | null = null;
	private inFlight: Promise<void> | null = null;

	/** Fetch the singleton, deduped per account. */
	load(client: JMAPClient, options?: { force?: boolean }): Promise<void> {
		const accountId = client.getAccountId();
		if (this.accountId === accountId && this.status === 'ready' && !options?.force) {
			return Promise.resolve();
		}
		if (this.inFlight) return this.inFlight;

		if (this.accountId !== accountId) {
			this.status = 'loading';
		}

		this.inFlight = (async () => {
			try {
				const vacation = await client.getVacationResponse();
				this.accountId = accountId;
				if (!vacation) {
					this.status = client.hasVacationResponse() ? 'error' : 'unavailable';
					return;
				}
				this.apply(vacation);
				this.status = 'ready';
			} catch {
				this.status = this.status === 'ready' ? 'ready' : 'error';
			} finally {
				this.inFlight = null;
			}
		})();
		return this.inFlight;
	}

	/**
	 * Persist a patch, optimistically reflecting it locally and reverting on
	 * failure. Returns whether the server accepted it.
	 */
	async save(
		client: JMAPClient,
		patch: Partial<Omit<JMAPVacationResponse, 'id'>>
	): Promise<boolean> {
		const before = this.snapshot();
		this.apply({ ...before, ...patch, id: 'singleton' });
		this.saving = true;
		try {
			await client.setVacationResponse(patch);
			return true;
		} catch {
			this.apply({ ...before, id: 'singleton' });
			return false;
		} finally {
			this.saving = false;
		}
	}

	private apply(vacation: JMAPVacationResponse): void {
		this.isEnabled = vacation.isEnabled ?? false;
		this.fromDate = vacation.fromDate ?? null;
		this.toDate = vacation.toDate ?? null;
		this.subject = vacation.subject ?? '';
		this.textBody = vacation.textBody ?? '';
	}

	private snapshot(): Omit<JMAPVacationResponse, 'id'> {
		return {
			isEnabled: this.isEnabled,
			fromDate: this.fromDate,
			toDate: this.toDate,
			subject: this.subject || null,
			textBody: this.textBody || null
		};
	}
}

export const vacation = new VacationStore();
